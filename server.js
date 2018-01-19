'use strict'
const Hapi = require('hapi')
const Boom = require('boom')
const SlackWebClient = require('@slack/client').WebClient
const MongoClient = require('mongodb').MongoClient

// Create a server with a host and port
const server = Hapi.server({
  host: 'localhost',
  port: process.env['PORT'] || 3000
})

const SLACK_VERIFICATION_TOKEN = process.env['SLACK_VERIFICATION_TOKEN']
const SLACK_OAUTH_TOKEN = process.env['SLACK_OAUTH_TOKEN']
const MONGODB_CONNECTION_STRING = process.env['MONGODB_CONNECTION_STRING']
const MONGODB_DATABASE_NAME = process.env['MONGODB_DATABASE_NAME']
const MONGODB_COLLECTION_NAME = process.env['MONGODB_COLLECTION_NAME']

// Set up the Slack web client with our access token
const slackClient = new SlackWebClient(SLACK_OAUTH_TOKEN)

/**
 * Determines, given an event stating that a user joined a channel, if the user actually has permissions to be in that channel or not. If the user is not on the whitelist *and* the user is not a bot, this function calls @see kickUser() which removes them from the channel.
 * Note that the whitelist is defined using a dictionary ( @see whitelist ) with the following format:
 * {
 *  'name-of-channel-without-hash-prefix': ['username1', 'username2', 'usernamen'],
 *  'some-other-channel': ['username4']
 * }
 * If a channel is not in the above whitelist dictionary, then any user can join the channel.
 *
 * @param {*} event The member_joined_channel event received from Slack. Note that this is a workspace event, so this function will receive all instances of a user joining a channel across all channels.
*/
async function handleMemberJoinedChannelEvent (event) {
  console.log('Got a member_joined_channel event from Slack: ', event)
  const isPrivateChannel = event.channel_type !== 'C'
  let channelsClient = slackClient.channels
  if (isPrivateChannel) {
    channelsClient = slackClient.groups
  }

  const channelResponse = await channelsClient.info(event.channel)
  if (!channelResponse.ok) {
    console.error('Got an error response back from Slack: ', channelResponse)
    throw Boom.internal('Slack\'s API returned a failure response')
  }

  const channel = channelResponse.channel
  let mongoConn = null
  let whitelist = null
  try {
    mongoConn = await MongoClient.connect(MONGODB_CONNECTION_STRING)
    whitelist = await mongoConn.db(MONGODB_DATABASE_NAME).collection(MONGODB_COLLECTION_NAME).findOne()
  } catch (err) {
    console.error('Failed to connect to MongoDB: ', err)
    throw err
  } finally {
    if (mongoConn) {
      mongoConn.close()
    }
  }

  if (!whitelist) {
    throw Boom.internal('Got an empty whitelist back from MongoDB')
  }

  if (whitelist.hasOwnProperty(channel.name)) {
    const channelWhitelist = whitelist[channel.name]
    const userResponse = await slackClient.users.info(event.user)
    if (!userResponse.ok) {
      console.error(userResponse)
      throw Boom.internal('Slack\'s API returned a failure response')
    }
    const user = userResponse.user
    const isUserBanned = channelWhitelist.indexOf(user.name) < 0 && !user.is_bot
    console.log(user.name, isUserBanned ? 'is not' : 'is', 'allowed in', channel.name)
    if (isUserBanned) {
      await kickUser(user, channel, channelsClient, event)
    } else {
      console.log(user.name, 'is on the whitelist for the following channel and won\'t be kicked: ', channel.name)
    }
  } else {
    console.log(channel.name, ' is not a whitelist-enabled channel, aborting')
  }
}

/**
 * Kicks @see user from @see channel and sends a message to @see channel stating that the user was kicked.
 * @param {*} user
 * @param {*} channel
 * @param {*} channelsClient
 * @param {*} event
 */
async function kickUser (user, channel, channelsClient, event) {
  console.log(user.name, 'is banned from channel', channel.name, ', kicking...')
  await channelsClient.kick(event.channel, event.user)
  console.log('Kicked', user.name, 'from channel', channel.name, '. Notifying the channel...')
  await slackClient.chat.postMessage(channel.name, `Automated Message: <@${event.user}> got the :boot: because they are not on the whitelist for this channel.`)
  console.log('Finished.')
}

/**
 * Called before the server starts to ensure the appropriate environment variables are set.
 */
function validateTokens () {
  if (!SLACK_VERIFICATION_TOKEN) {
    throw new Error('FATAL: SLACK_VERIFICATION_TOKEN was not defined')
  }

  if (!SLACK_OAUTH_TOKEN) {
    throw new Error('FATAL: SLACK_OAUTH_TOKEN was not defined')
  }

  if (!MONGODB_CONNECTION_STRING) {
    throw new Error('FATAL: MONGODB_CONNECTION_STRING was not defined')
  }

  if (!MONGODB_DATABASE_NAME) {
    throw new Error('FATAL: MONGODB_DATABASE_NAME was not defined')
  }

  if (!MONGODB_COLLECTION_NAME) {
    throw new Error('FATAL: MONGODB_COLLECTION_NAME was not defined')
  }
}

// Add the route for the API
server.route({
  method: 'POST',
  path: '/api/onSlackMessage',
  handler: async function (request, h) {
    const params = request.payload
    if (!params || params.token !== SLACK_VERIFICATION_TOKEN) {
      console.warn('Token ', params.token, ' did not match the expected token: ', SLACK_VERIFICATION_TOKEN)
      throw Boom.badRequest()
    }

    if (params.type === 'url_verification') {
      console.log('Got a url_verification request from slack: ', params)
      return {
        'challenge': params.challenge
      }
    } else if (params.type === 'event_callback' && params.event && params.event.type === 'member_joined_channel') {
      try {
        await handleMemberJoinedChannelEvent(params.event)
      } catch (err) {
        console.error('Encountered an unhandled exception while handling a member_joined_channel event: ', err)
        throw Boom.internal('Encountered an unhandled exception while handling a member_joined_channel event. See logs from stdout for more information.')
      }
      return {'ok': true}
    } else {
      console.warn('Got an unknown request: ', params)
      throw Boom.badRequest()
    }
  }
})

/**
 * Starts the server. If there are any errors encountered while starting the server, exits with an error status code.
 */
async function start () {
  try {
    validateTokens()
    await server.start()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }

  console.log('=> Server running at: ', server.info.uri)
}

start()
