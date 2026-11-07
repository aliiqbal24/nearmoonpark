import PublicPark from "@/app/components/public-park";
export default async function ParkPage({
  params,
}: {
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  return <PublicPark accountId={account} />;
}
