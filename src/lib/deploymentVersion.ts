const DEFAULT_DEPLOYMENT_VERSION = 'local-dev';

export function getDeploymentVersion(): string {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION?.trim() || DEFAULT_DEPLOYMENT_VERSION;
}
