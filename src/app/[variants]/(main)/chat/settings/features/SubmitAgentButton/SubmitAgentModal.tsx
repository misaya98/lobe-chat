'use client';

import { ModalForm, ProDescriptions, ProFormText } from '@ant-design/pro-components';
import { type ModalProps } from '@lobehub/ui';
import { Tag, Typography } from 'antd';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { message } from '@/components/AntdStaticMethods';
import { useMarketAuth } from '@/layout/AuthProvider/MarketAuth';
import { marketApiService } from '@/services/marketApi';
import { useAgentStore } from '@/store/agent';
import { agentChatConfigSelectors, agentSelectors } from '@/store/agent/selectors';
import { useGlobalStore } from '@/store/global';
import { globalGeneralSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/selectors';

interface FormValues {
  identifier: string;
}

const SubmitAgentModal = memo<ModalProps>(({ open, onCancel }) => {
  const { t } = useTranslation('setting');

  // Market auth
  const { session: marketSession, isAuthenticated } = useMarketAuth();

  // Session store actions
  const updateSessionMeta = useSessionStore((s) => s.updateSessionMeta);

  // 获取所有配置数据
  const systemRole = useAgentStore(agentSelectors.currentAgentSystemRole);
  const meta = useSessionStore(sessionMetaSelectors.currentAgentMeta, isEqual);
  const language = useGlobalStore(globalGeneralSelectors.currentLanguage);
  const agentConfig = useAgentStore(agentSelectors.currentAgentConfig);
  const chatConfig = useAgentStore(agentChatConfigSelectors.currentChatConfig);
  const plugins = useAgentStore(agentSelectors.currentAgentPlugins);
  const ttsConfig = useAgentStore(agentSelectors.currentAgentTTS);
  const model = useAgentStore(agentSelectors.currentAgentModel);
  const provider = useAgentStore(agentSelectors.currentAgentModelProvider);
  const knowledgeBases = useAgentStore(agentSelectors.currentAgentKnowledgeBases);
  const files = useAgentStore(agentSelectors.currentAgentFiles);

  const handleSubmit = async (values: FormValues) => {
    if (!isAuthenticated || !marketSession?.accessToken) {
      message.error('请先登录市场账户');
      return false;
    }

    try {
      message.loading({ content: '正在发布助手...', key: 'submit' });

      // Set access token for API calls
      marketApiService.setAccessToken(marketSession.accessToken);

      // Step 1: Create agent
      console.log('Step 1: Creating agent...');
      const agentCreateData = {
        identifier: values.identifier,
        name: meta?.title || '未命名助手',
        status: 'published' as const,
        visibility: 'public' as const,
      };

      const agentResult = await marketApiService.createAgent(agentCreateData);
      console.log('Agent created:', agentResult);

      // Step 2: Create agent version with all configuration data
      console.log('Step 2: Creating agent version...');
      // eslint-disable-next-line sort-keys-fix/sort-keys-fix
      const versionData = {
        a2aProtocolVersion: '1.0.0',
        avatar: meta?.avatar,
        category: meta?.tags?.[0] || 'general',
        changelog: '首次发布',
        config: {
          // Chat configuration
          chatConfig: {
            displayMode: chatConfig?.displayMode,
            enableHistoryCount: chatConfig?.enableHistoryCount,
            historyCount: chatConfig?.historyCount,
            maxTokens: agentConfig?.params?.max_tokens,
            searchMode: chatConfig?.searchMode,
            temperature: agentConfig?.params?.temperature,
            topP: agentConfig?.params?.top_p,
          },

          description: meta?.description,

          // Files
          files:
            files?.map((file) => ({
              enabled: file.enabled,
              id: file.id,
              name: file.name,
              type: file.type,
            })) || [],

          // Knowledge bases
          knowledgeBases:
            knowledgeBases?.map((kb) => ({
              enabled: kb.enabled,
              id: kb.id,
              name: kb.name,
            })) || [],

          // Language
          locale: language,

          // Model configuration
          model: {
            model,
            parameters: agentConfig?.params,
            provider,
          },

          // Plugins
          plugins:
            plugins?.map((plugin) => ({
              enabled: true,
              identifier: plugin,
              settings: {},
            })) || [],

          // System role and description
          systemRole: systemRole || '你是一个有用的助手。',
          // TTS configuration
          tts: {
            ttsService: ttsConfig?.ttsService,
            voice: ttsConfig?.voice,
          },
        },
        defaultInputModes: ['text'],
        defaultOutputModes: ['text'],
        description: meta?.description || '',
        identifier: values.identifier,
        name: meta?.title || '未命名助手',
        setAsCurrent: true,
        summary: meta?.description || systemRole?.slice(0, 100),
      };

      const versionResult = await marketApiService.createAgentVersion(versionData);
      console.log('Version created:', versionResult);

      // Step 3: Update session meta with market identifier
      console.log('🔸 [Modal] Calling updateSessionMeta with marketIdentifier:', values.identifier);
      await updateSessionMeta({
        marketIdentifier: values.identifier,
      });
      console.log('🔸 [Modal] updateSessionMeta completed');

      message.success({ content: '助手发布成功！', key: 'submit' });
      return true; // 返回 true 表示提交成功，会自动关闭 Modal
    } catch (error) {
      console.error('Submit agent failed:', error);
      const errorMessage = error instanceof Error ? error.message : '发布失败';
      message.error({ content: `发布失败: ${errorMessage}`, key: 'submit' });
      return false;
    }
  };

  return (
    <ModalForm<FormValues>
      modalProps={{
        bodyStyle: { maxHeight: '60vh', overflow: 'auto' },
        destroyOnClose: true,
        onCancel,
      }}
      onFinish={handleSubmit}
      open={open}
      submitter={{
        resetButtonProps: {
          style: { display: 'none' },
        },
        submitButtonProps: {
          children: '发布',
        },
      }}
      title={t('submitAgentModal.tooltips')}
      width={800}
    >
      {/* 标识符输入 */}
      <ProFormText
        extra="标识符将作为助手的唯一标识，建议使用小写字母、数字和连字符"
        label="助手标识符"
        name="identifier"
        placeholder="请输入助手的唯一标识符，如: web-development"
        rules={[
          { message: '请输入助手标识符', required: true },
          { message: '标识符只能包含小写字母、数字和连字符', pattern: /^[\da-z-]+$/ },
          { max: 50, message: '标识符长度应在3-50个字符之间', min: 3 },
        ]}
      />

      <div style={{ marginTop: 24 }}>
        <Flexbox gap={24}>
          {/* 基础信息 */}
          <ProDescriptions
            bordered
            column={2}
            columns={[
              {
                dataIndex: 'title',
                key: 'title',
                title: '名称',
              },
              {
                dataIndex: 'avatar',
                key: 'avatar',
                render: (_: any, record: any) => {
                  const avatar = record.avatar;
                  if (avatar === '未设置') return avatar;

                  // 如果是 http 或 https 链接，显示图片
                  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                    return (
                      <img
                        alt="avatar"
                        src={avatar}
                        style={{ borderRadius: '50%', height: 40, width: 40 }}
                      />
                    );
                  }

                  // 否则直接显示字符（emoji）
                  return (
                    <div
                      style={{
                        fontSize: '24px',
                        height: 40,
                        lineHeight: '40px',
                        textAlign: 'center',
                        width: 40,
                      }}
                    >
                      {avatar}
                    </div>
                  );
                },
                title: '头像',
              },
              {
                dataIndex: 'description',
                key: 'description',
                span: 2,
                title: '描述',
              },
              {
                dataIndex: 'tags',
                key: 'tags',
                render: (_: any, record: any) => {
                  const tags = record.tags;
                  if (tags === '未设置') return tags;
                  if (Array.isArray(tags)) {
                    return tags.map((tag, index) => (
                      <Tag color="blue" key={index}>
                        {tag}
                      </Tag>
                    ));
                  }
                  return tags;
                },
                span: 2,
                title: '标签',
              },
            ]}
            dataSource={{
              avatar: meta?.avatar || '未设置',
              description: meta?.description || '未设置',
              tags: meta?.tags?.length ? meta.tags : '未设置',
              title: meta?.title || '未设置',
            }}
            size="small"
            title="助手信息"
          />

          {/* 角色设定 */}
          <ProDescriptions
            bordered
            column={1}
            columns={[
              {
                dataIndex: 'systemRole',
                key: 'systemRole',
                render: (_: any, record: any) => {
                  const text = record.systemRole;
                  if (text === '未设置') return text;
                  return (
                    <Typography.Text
                      ellipsis={{
                        tooltip: '点击查看完整内容',
                      }}
                    >
                      {text}
                    </Typography.Text>
                  );
                },
                title: '系统角色',
              },
            ]}
            dataSource={{
              systemRole: systemRole || '未设置',
            }}
            size="small"
            title="角色设定"
          />

          {/* 模型设置 */}
          <ProDescriptions
            bordered
            column={2}
            columns={[
              {
                dataIndex: 'model',
                key: 'model',
                title: '模型',
              },
              {
                dataIndex: 'provider',
                key: 'provider',
                title: '提供商',
              },
              {
                dataIndex: 'temperature',
                key: 'temperature',
                title: '温度',
              },
              {
                dataIndex: 'topP',
                key: 'topP',
                title: 'Top P',
              },
              {
                dataIndex: 'maxTokens',
                key: 'maxTokens',
                span: 2,
                title: '最大令牌数',
              },
            ]}
            dataSource={{
              maxTokens: agentConfig?.params?.max_tokens ?? '未设置',
              model: model || '未设置',
              provider: provider || '未设置',
              temperature: agentConfig?.params?.temperature ?? '未设置',
              topP: agentConfig?.params?.top_p ?? '未设置',
            }}
            size="small"
            title="模型设置"
          />

          {/* 聊天偏好 */}
          <ProDescriptions
            bordered
            column={2}
            columns={[
              {
                dataIndex: 'historyCount',
                key: 'historyCount',
                title: '历史消息数',
              },
              {
                dataIndex: 'enableHistoryCount',
                key: 'enableHistoryCount',
                title: '启用历史计数',
              },
              {
                dataIndex: 'displayMode',
                key: 'displayMode',
                title: '显示模式',
              },
              {
                dataIndex: 'searchMode',
                key: 'searchMode',
                title: '搜索模式',
              },
            ]}
            dataSource={{
              displayMode: chatConfig?.displayMode || '未设置',
              enableHistoryCount: chatConfig?.enableHistoryCount ? '是' : '否',
              historyCount: chatConfig?.historyCount ?? '未设置',
              searchMode: chatConfig?.searchMode || '未设置',
            }}
            size="small"
            title="聊天偏好"
          />

          {/* 语音服务 */}
          <ProDescriptions
            bordered
            column={2}
            columns={[
              {
                dataIndex: 'ttsService',
                key: 'ttsService',
                title: 'TTS服务',
              },
              {
                dataIndex: 'voice',
                key: 'voice',
                title: '语音设置',
              },
            ]}
            dataSource={{
              ttsService: ttsConfig?.ttsService || '未设置',
              voice: JSON.stringify(ttsConfig?.voice) || '未设置',
            }}
            size="small"
            title="语音服务"
          />

          {/* 插件设置 */}
          <ProDescriptions
            bordered
            column={1}
            columns={[
              {
                dataIndex: 'plugins',
                key: 'plugins',
                render: (_: any, record: any) => {
                  const pluginList = record.plugins;
                  if (!pluginList?.length) return '未安装插件';
                  return pluginList.map((plugin: string, index: number) => (
                    <Tag color="green" key={index}>
                      {plugin}
                    </Tag>
                  ));
                },
                title: '已安装插件',
              },
            ]}
            dataSource={{
              plugins: plugins?.length ? plugins : [],
            }}
            size="small"
            title={`插件设置 (${plugins?.length || 0}个)`}
          />

          {/* 知识库 */}
          <ProDescriptions
            bordered
            column={1}
            columns={[
              {
                dataIndex: 'knowledgeBases',
                key: 'knowledgeBases',
                render: (_: any, record: any) => {
                  const kbList = record.knowledgeBases;
                  if (!kbList?.length) return '未配置知识库';
                  return kbList.map((kb: any, index: number) => (
                    <Tag color={kb.enabled ? 'blue' : 'default'} key={index}>
                      {kb.name} {kb.enabled ? '(已启用)' : '(已禁用)'}
                    </Tag>
                  ));
                },
                title: '知识库',
              },
              {
                dataIndex: 'files',
                key: 'files',
                render: (_: any, record: any) => {
                  const fileList = record.files;
                  if (!fileList?.length) return '未上传文件';
                  return fileList.map((file: any, index: number) => (
                    <Tag color={file.enabled ? 'orange' : 'default'} key={index}>
                      {file.name} ({file.type}) {file.enabled ? '(已启用)' : '(已禁用)'}
                    </Tag>
                  ));
                },
                title: '文件',
              },
            ]}
            dataSource={{
              files: files?.length ? files : [],
              knowledgeBases: knowledgeBases?.length ? knowledgeBases : [],
            }}
            size="small"
            title={`知识库设置 (知识库: ${knowledgeBases?.length || 0}个, 文件: ${files?.length || 0}个)`}
          />
        </Flexbox>
      </div>
    </ModalForm>
  );
});

export default SubmitAgentModal;
