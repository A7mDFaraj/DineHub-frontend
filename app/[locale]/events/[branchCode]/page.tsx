import { PublicEvents } from '@/components/events/public-events';
export default async function EventsPage({ params }: { params: Promise<{ branchCode: string }> }) {
 const { branchCode } = await params;
 return <PublicEvents branchCode={branchCode}/>;
}
