class ServerlessPlugin {
  /**
   * Create an instance of our ServerlessPlugin.
   * @param   {Object} serverless Host Serverless instance into which this
   *                              plugin is loading.
   * @returns {Object} Instance of this plugin for use by Serverless.
   */
  constructor(serverless) {
    this.serverless = serverless
    this.hooks = {
      'before:deploy:deploy': this.attachPermissionsBoundary.bind(this),
    }
  }

  /**
   * Verify configuration provided is a valid one.
   */
  verifyConfig() {
    const permissionsBoundary = this.serverless.service.provider.permissionsBoundary || ''

    // Must be a string because only a single permission boundary string is allowed
    if (typeof permissionsBoundary === 'string') {
      this.permissionsBoundary = permissionsBoundary
    } else {
      throw new Error('permissionsBoundary must be a single policy ARN')
    }

    if (!permissionsBoundary.match(/^arn:aws:iam::([0-9]+|aws):policy\/.*$/)) {
      throw new Error(`"${permissionsBoundary}" is not a valid policy ARN.`)
    }
  }

  /**
   * Given a CFT role object, apply the policy ARNs to the role as Permission Boundary.
   * @param {Object}          role      CFT Role Resource to add the policies.
   */
  applyPermissionsBoundaryToRole(role) {
    // eslint-disable-next-line no-param-reassign
    role.PermissionsBoundary = this.permissionsBoundary
  }

  /**
   * Handler for the Serverless before:deploy:deploy event.
   * Attaches the Permission Boundary defined at `provider.permissionsBoundary`
   * to each of the roles in the service.
   */
  attachPermissionsBoundary() {
    // Bail if not policies are to be applied or no resources defined.
    if (!(this.serverless.service.provider.permissionsBoundary)) return
    if (!(this.serverless.service.provider.compiledCloudFormationTemplate.Resources)) return

    this.verifyConfig()
    const resources = this.serverless.service.provider.compiledCloudFormationTemplate.Resources

    console.log('Begin Attach Permission Boundary plugin...')

    // Filter for any IAM Roles defined in CFT and apply our Permission Boundary.
    Object.keys(resources)
      .filter(resourceName => resources[resourceName].Type === 'AWS::IAM::Role')
      .forEach(roleResource =>
        this.applyPermissionsBoundaryToRole(resources[roleResource].Properties))

    console.log('Attach Permission Boundary plugin done.')
  }
}

module.exports = ServerlessPlugin
