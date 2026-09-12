export type DeploymentStatus = "active" | "superseded" | "rolled_back";

export interface Deployment {
  id: string;
  serviceId: string;
  version: string;
  deployedAt: string;
  deployedBy: string;
  status: DeploymentStatus;
  previousDeploymentId: string | null;
}
