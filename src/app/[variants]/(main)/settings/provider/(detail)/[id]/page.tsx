'use client';

import { useParams } from 'next/navigation';

import { DEFAULT_MODEL_PROVIDER_LIST } from '@/config/modelProviders';
import { useAiInfraStore } from '@/store/aiInfra';

import ClientMode from './ClientMode';
import ProviderDetail from './index';

const Page = () => {
  const params = useParams();
  const id = params.id as string;

  // 统一在这里获取数据
  const useFetchAiProviderItem = useAiInfraStore((s) => s.useFetchAiProviderItem);
  useFetchAiProviderItem(id);

  const builtinProviderCard = DEFAULT_MODEL_PROVIDER_LIST.find((v) => v.id === id);
  // if builtin provider
  if (!!builtinProviderCard) return <ProviderDetail source={'builtin'} {...builtinProviderCard} />;

  return <ClientMode id={id} />;
};

export default Page;
