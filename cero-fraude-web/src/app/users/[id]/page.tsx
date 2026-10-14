
import { UserDetail } from "@/components/user-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;

  return <UserDetail userId={id} />;
}
