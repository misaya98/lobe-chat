'use client';

import { DEFAULT_MODEL_PROVIDER_LIST } from '@/config/modelProviders';
import { useAiInfraStore } from '@/store/aiInfra';

import ClientMode from './ClientMode';
import ProviderDetail from './index';

interface PageContentProps {
  id: string;
}

const PageContent = ({ id }: PageContentProps) => {
  const useFetchAiProviderItem = useAiInfraStore((s) => s.useFetchAiProviderItem);
  useFetchAiProviderItem(id);

  const builtinProviderCard = DEFAULT_MODEL_PROVIDER_LIST.find((v) => v.id === id);
  if (!!builtinProviderCard) return <ProviderDetail source={'builtin'} {...builtinProviderCard} />;

  return <ClientMode id={id} />;
};

export default PageContent;
