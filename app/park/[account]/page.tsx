import PublicPark from "@/app/components/public-park";
export default async function ParkPage({
  params,
  searchParams,
}: {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const [{ account }, query] = await Promise.all([params, searchParams]);
  const version =
    query.version === "v4" ||
    query.version === "v5" ||
    query.version === "v6" ||
    query.version === "v7" ||
    query.version === "v8"
      ? query.version
      : undefined;
  return <PublicPark accountId={account} version={version} />;
}
