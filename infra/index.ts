import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Duration, Stack, } from 'aws-cdk-lib';
import { join } from 'path'
import { NodejsFunction, ICommandHooks } from 'aws-cdk-lib/aws-lambda-nodejs';

export class PuppeteerServiceStack extends Stack {
    constructor(app: App, id: string, { stage }: any) {
        super(app, id);
        const name = 'puppeteer-service-' + stage;

        const httpLambda = new NodejsFunction(this, name, {
            functionName: name,
            bundling: {
                externalModules: [
                    'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
                ],
                nodeModules: [
                    'chrome-aws-lambda',
                    'puppeteer-core'
                ],
                commandHooks: {
                    afterBundling(inputDir: string, outputDir: string): string[] {
                        return [];
                    },
                    beforeInstall(inputDir: string, outputDir: string): string[] {
                        return [];
                    },
                    beforeBundling(inputDir: string, outputDir: string): string[] {
                        return [`cp -R ${inputDir}/../dist/html/ ${outputDir}/dist`];
                    },
                },
                tsconfig: 'server/tsconfig.json'
            },
            memorySize: 2048,
            timeout: Duration.seconds(6),
            depsLockFilePath: join(__dirname, '..', '..', 'server', 'package-lock.json'),
            entry: join(__dirname, '..', '..', 'server', 'index.ts'),
            runtime: Runtime.NODEJS_14_X,
            environment: {},
        });

        // Integrate the Lambda functions with the API Gateway resource
        const httpIntegration = new LambdaIntegration(httpLambda);


        // Create an API Gateway resource for each of the CRUD operations
        const api = new RestApi(this, name + '-api-gateway', {
            restApiName: name + '-api-gateway',
            binaryMediaTypes: ['*/*']
        });

        const items = api.root.addResource('{proxy+}');
        items.addMethod('POST', httpIntegration);
        addCorsOptions(items);
    }
}

export function addCorsOptions(apiResource: IResource) {
    apiResource.addMethod('OPTIONS', new MockIntegration({
        integrationResponses: [{
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Credentials': "'false'",
                'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
            },
        }],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
        },
    }), {
        methodResponses: [{
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Headers': true,
                'method.response.header.Access-Control-Allow-Methods': true,
                'method.response.header.Access-Control-Allow-Credentials': true,
                'method.response.header.Access-Control-Allow-Origin': true,
            },
        }]
    })
}

const app = new App();
new PuppeteerServiceStack(app, 'PuppeteerServiceStack', { stage: 'qa' });
app.synth();
