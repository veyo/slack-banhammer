# slack-banhammer :hammer: :boom: 
Automatically kicks users that are not on a whitelist from certain Slack channels, like so:

![slack-banhammer](https://github.com/veyo/slack-banhammer/raw/master/slack-banhammer.png "An example of the message you see when someone gets banned from a channel")
___

### Dependencies
1. The latest Node.js LTS release (at the time of this document being written, 8.9.x). This app only works with versions of `node >= 8` because `async`/`await` is used and those JS language features are not available in earlier versions of node.
1. A MongoDB collection to store the whitelist in. You can sign up for a free MongoDB Server here: https://mlab.com/plans/pricing/#plan-type=sandbox
1. Somewhere to deploy a Node application to. See "Deploying the service" for more details.

### Environment Variables
Here are all of the environment variables used by the app and some example values to help you understand which values to use:
* `MONGODB_COLLECTION_NAME` = `whitelist`
* `MONGODB_CONNECTION_STRING` = `mongodb://<username>:<password>@<server>:<port>/somedatabasename`
* `MONGODB_DATABASE_NAME` = `somedatabasename`
* `SLACK_OAUTH_TOKEN` = `xoxp-...`
  * NOTE: `SLACK_OAUTH_TOKEN` **cannot be a bot token** because bots do not have permission to kick users.
* `SLACK_VERIFICATION_TOKEN` = `<token found under 'Basic Information' -> 'App Credentials' in your Slack App>`

See "Configuring the Slack App" to figure out where to find the `SLACK_` values above.

### Building / Running
1. Set all of the environment variables noted in "Environment Variables"
1. Run `npm install` to install all required libraries.
1. Run `npm start` to start a local development server on port 3000.

### Configuring the whitelist
Since this service fetches the whitelist from MongoDB, you'll need to connect to your MongoDB instance (i.e. using `MONGODB_CONNECTION_STRING`) when you want to update the whitelist. The app expects the collection defined by the environment variable `MONGODB_COLLECTION_NAME` to have exactly one document which is the whitelist. Said document has the following format:
```json
{
  "name-of-channel-without-hash-prefix": ["username1", "username2", "usernamen"],
  "some-other-channel": ["username4"]
}
```

For example, if a user named `username5` were to join `#some-other-channel` then they would be kicked since they're not on the whitelist for that channel. `username4` would be allowed in this case. **Also, all bots are whitelisted.**

### Configuring the Slack App
1. Create a user for this app in Slack with some relevant username i.e. `veyo-ban-hammer`. This user will be used to both kick users and notify the channel whenever someone is kicked.
2. Invite the user to all the channels that you want to be controlled by a whitelist.

3. Log in as the user, i.e. `veyo-ban-hammer`
4. Create a new Slack App with the following settings:

![slack-verification-token-settings](https://github.com/veyo/slack-banhammer/raw/master/slack-verification-token.png "Slack Verification Token Settings")

![slack-oauth-settings](https://github.com/veyo/slack-banhammer/raw/master/slack-oauth.png "Slack OAuth Settings")

![slack-event-subscriptions](https://github.com/veyo/slack-banhammer/raw/master/slack-event-subscriptions.png "Slack Event Subscriptions")

5. Deploy the app to the URL you defined in "Request URL" in Slack -> Event Subscriptions.
6. Use the "Install App" menu to install the app to the workspace.

### Deploying the app
Pretty much anything that supports Node 8.x will work including AWS Elastic Beanstalk, Azure App Service, Heroku, Zeit.co, etc.

When you deploy, make sure that all environment variables noted in "Environment Variables" are set, otherwise the app will fail to start.

### Pull requests

If you would like to contribute, feel free to open a pull request: https://github.com/veyo/slack-banhammer/pulls. In your PR, please include an appropriate title which cleanly summarizes the change that you're making.

### Issues / Feedback / Feature Requests?

If you have any issues, comments or want to see new features, please file an issue:

https://github.com/veyo/slack-banhammer/issues
