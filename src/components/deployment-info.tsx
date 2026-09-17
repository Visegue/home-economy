import { getDeploymentVersion } from "@/lib/deployment-version";

type Deployment = ReturnType<typeof getDeploymentVersion>;

export function DeploymentInfo({ deployment }: { deployment: Deployment }) {
  return (
    <details className="mx-auto max-w-full text-center text-xs text-muted-foreground">
      <summary className="cursor-pointer rounded-sm hover:text-foreground">
        {deployment.kind === "production" ? (
          <>Version {deployment.version}</>
        ) : deployment.kind === "preview" ? (
          <>Förhandsversion {deployment.commit?.slice(0, 7) ?? "okänd"}</>
        ) : (
          <>Lokal utveckling</>
        )}
      </summary>
      <div className="mt-2 space-y-1">
        {deployment.kind === "preview" && deployment.branch && (
          <p className="break-all">Gren: {deployment.branch}</p>
        )}
        {deployment.kind !== "local" && (
          <p className="break-all">Revision: {deployment.commit ?? "okänd"}</p>
        )}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href="https://github.com/Visegue/home-economy/releases"
        >
          Se publicerade releaser på GitHub
        </a>
      </div>
    </details>
  );
}
