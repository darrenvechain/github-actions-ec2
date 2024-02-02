import * as cdk from 'aws-cdk-lib'
import {Construct} from 'constructs'
import {
  CfnComponent,
  CfnDistributionConfiguration,
  CfnImagePipeline,
  CfnImageRecipe,
  CfnInfrastructureConfiguration
} from "aws-cdk-lib/aws-imagebuilder"

const fs = require('fs')
const path = require("path")

export class GhActionsEc2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const setupDocker = buildComponent(this, 'SetupDocker')
    const installGit = buildComponent(this, 'InstallGit')
    const setupNode = buildComponent(this, 'SetupNode')

    const recipeComponents = [setupDocker, installGit, setupNode]

    const ghActionsRecipe = new CfnImageRecipe(this, 'GHActionsRecipe_CDK', {
      name: 'GHActionsRecipe_CDK',
      version: '1.0.0',
      parentImage: `arn:aws:imagebuilder:${this.region}:aws:image/amazon-linux-2-x86/x.x.x`,
      components: recipeComponents.map(component => {
        return {
          componentArn: component.attrArn
        }
      })
    })

    const distributionConfig = new CfnDistributionConfiguration(this, 'GHActionsDistributionConfiguration', {
      name: 'GHActionsDistributionConfiguration',
      distributions: []
    })

    const infrastructureConfig = new CfnInfrastructureConfiguration(this, 'GHActionsInfrastructureConfiguration', {
      name: 'GHActionsInfrastructureConfiguration',
      instanceProfileName: 'EC2InstanceProfileForImageBuilder'
    })

    new CfnImagePipeline(this, 'GHActionsImagePipeline', {
      name: 'GHActionsImagePipeline',
      description: 'A pipeline to build a GitHub Actions EC2 image',
      imageRecipeArn: ghActionsRecipe.attrArn,
      infrastructureConfigurationArn: infrastructureConfig.attrArn,
      distributionConfigurationArn: distributionConfig.attrArn,
      status: 'ENABLED'
    })
  }
}

const buildComponent = (stack: GhActionsEc2Stack, componentName: string) => {
  const componentData = fs.readFileSync(path.resolve(__dirname, `components/${componentName}.yaml`), 'utf8')

  return new CfnComponent(stack, componentName, {
    name: componentName,
    version: '1.0.0',
    platform: 'Linux',
    supportedOsVersions: ['Amazon Linux 2'],
    data: componentData
  })
}