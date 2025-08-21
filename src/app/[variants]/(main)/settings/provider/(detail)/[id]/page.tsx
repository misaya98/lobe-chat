import { PagePropsWithId } from '@/types/next';

import PageContent from './PageContent';

const Page = async (props: PagePropsWithId) => {
  const params = await props.params;

  return <PageContent id={params.id} />;
};

export default Page;

export const dynamic = 'force-static';
