# slack-banhammer

Automatically kicks users that are not on a whitelist from certain Slack channels. This service relies on the `serverless-azure-functions` plugin, and therefore, before you can deploy it, you simply need to run `npm install` in order to acquire it (this dependency is already saved in the `package.json` file).

### Setting up the Azure credentials

Once the `serverless-azure-functions` plugin is installed, it expects to find the Azure credentials via a set of well-known environment variables. These will be used to actually authenticate with the Azure account, so that the Serverless CLI can generate the necessary Azure resources on the behalf when you request a deployment (see below).

The following environment variables must be set, with their respective values:

- *azureSubId* - ID of the Azure subscription you want to create the service within
- *azureServicePrincipalTenantId* - ID of the tenant that the service principal was created within
- *azureServicePrincipalClientId* - ID of the service principal you want to use to authenticate with Azure
- *azureServicePrincipalPassword* - Password of the service principal you want to use to authenticate with Azure

For details on how to create a service principal and/or acquire the Azure account's subscription/tenant ID, refer to the [Azure credentials](https://serverless.com/framework/docs/providers/azure/guide/credentials/) documentation.

### Deploying the service

Once the Azure credentials are set, you can immediately deploy the service via the following command:

```shell
serverless deploy
```

This will create the necessary Azure resources to support the service and events that are defined in the `serverless.yml` file.

### Invoking and inspecting a function

With the service deployed, you can test it's functions using the following command:

```shell
serverless invoke -f slackBanHammer
```

Additionally, if you'd like to view the logs that a function generates (either via the runtime, or create by the handler by calling `context.log`), you can simply run the following command:

```shell
serverless logs -f slackBanHammer
```

### Cleaning up

Once you're finished with the service, you can remove all of the generated Azure resources by simply running the following command:

```shell
serverless remove
```

### Issues / Feedback / Feature Requests?

If you have any issues, comments or want to see new features, please file an issue in the project repository:

https://github.com/veyo/slack-banhammer
