# 🎨 UI Improvement Proposal: MultiChain Workflow

## 📋 Overview

Proposta de melhoria da interface do Passport Sample App para suportar seleção de chain antes da conexão, substituindo o fluxo atual "ZkEvm Workflow" por um "MultiChain Workflow" mais flexível.

---

## 🔍 Análise do Fluxo Atual

### **Estado Atual:**

```typescript
// PassportProvider.tsx
const connectZkEvm = useCallback(async () => {
  const provider = await passportClient.connectEvm();
  // Provider é criado com chain baseada no Environment (PRODUCTION/SANDBOX/DEV)
  // Environment.PRODUCTION → zkEVM Mainnet (13371)
  // Environment.SANDBOX → zkEVM Testnet (13473)
}, [passportClient]);
```

```tsx
// ZkEvmWorkflow.tsx
<CardStack title="ZkEvm Workflow">
  {!zkEvmProvider && (
    <WorkflowButton onClick={connectZkEvm}>
      Connect ZkEvm
    </WorkflowButton>
  )}
</CardStack>
```

### **Problemas Identificados:**

1. ❌ **Chain hardcoded:** O botão "Connect ZkEvm" sempre conecta em zkEVM (Mainnet ou Testnet baseado no Environment)
2. ❌ **Sem flexibilidade:** Não é possível testar wallets em outras chains (Base, Optimism, etc.) sem mudar o Environment
3. ❌ **Nome limitado:** "ZkEvm Workflow" não reflete a possibilidade de multichain
4. ❌ **UX inconsistente:** Usuário não sabe em qual chain está conectando antes de clicar

---

## 🎯 Proposta de Melhoria

### **Nova Interface: MultiChain Workflow**

```tsx
// MultiChainWorkflow.tsx (novo componente)
<CardStack title="MultiChain Workflow">
  <Stack direction="vertical" gap={3}>
    {/* Chain Selector */}
    {!evmProvider && (
      <FormControl>
        <FormControl.Label>Select Chain</FormControl.Label>
        <Select value={selectedChain} onChange={handleChainChange}>
          <option value="zkEVM-mainnet">zkEVM Mainnet (13371)</option>
          <option value="zkEVM-testnet">zkEVM Testnet (13473)</option>
          <option value="base-mainnet">Base Mainnet (8453)</option>
          <option value="base-sepolia">Base Sepolia (84532)</option>
          <option value="optimism-mainnet">Optimism Mainnet (10)</option>
          <option value="optimism-sepolia">Optimism Sepolia (11155420)</option>
        </Select>
      </FormControl>
    )}

    {/* Connect Button */}
    {!evmProvider && (
      <WorkflowButton
        disabled={isLoading || !selectedChain}
        onClick={connectEvm}
      >
        Connect to {getChainName(selectedChain)}
      </WorkflowButton>
    )}

    {/* Connected State */}
    {evmProvider && (
      <>
        <Box sx={{ color: 'success.main' }}>
          ✅ Connected to {currentChain.name} ({currentChain.id})
        </Box>
        <WorkflowButton onClick={handleRequest}>
          request
        </WorkflowButton>
        <FormControl sx={{ alignItems: 'center' }}>
          <Toggle onChange={onHandleEventsChanged} />
          <FormControl.Label>Log out events</FormControl.Label>
        </FormControl>
      </>
    )}
  </Stack>
</CardStack>
```

---

## 🏗️ Mudanças Necessárias

### **1. PassportProvider.tsx**

#### **Estado Atual:**
```typescript
const [zkEvmProvider, setZkEvmProvider] = useState<Provider | undefined>();

const connectZkEvm = useCallback(async () => {
  const provider = await passportClient.connectEvm();
  setZkEvmProvider(provider);
}, [passportClient]);
```

#### **Nova Implementação:**
```typescript
const [evmProvider, setEvmProvider] = useState<Provider | undefined>();
const [currentChain, setCurrentChain] = useState<{ id: number; name: string } | undefined>();

const connectEvm = useCallback(async (chainId: number, chainName: string) => {
  setIsLoading(true);
  
  try {
    // 1. Obter provider base do Passport
    const provider = await passportClient.connectEvm();
    
    if (!provider) {
      addMessage('ConnectEvm', 'Failed to connect');
      return;
    }

    // 2. Verificar se precisa wrappear com adapter
    const needsAdapter = chainId !== 13371 && chainId !== 13473; // Não é zkEVM
    
    let finalProvider = provider;
    
    if (needsAdapter) {
      // Wrappear com adapter para chains não-zkEVM
      const { PassportNexusAdapter } = await import('@immutable/passport-nexus-adapter');
      const { Wallet } = await import('ethers');
      
      const adapter = new PassportNexusAdapter({
        nexusConfig: {
          nexusImplementation: process.env.NEXT_PUBLIC_NEXUS_IMPLEMENTATION!,
          rpcUrl: getRpcUrl(chainId),
          bundlerUrl: getBundlerUrl(chainId),
          chainId: chainId,
        },
        signer: new Wallet(process.env.NEXT_PUBLIC_OWNER_PK!),
        debug: true,
      });
      
      finalProvider = adapter.wrapProvider(provider);
      addMessage('ConnectEvm', `Connected to ${chainName} (with Nexus adapter)`);
    } else {
      addMessage('ConnectEvm', `Connected to ${chainName} (native)`);
    }
    
    // 3. Solicitar provider para mudar de chain
    await finalProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    
    setEvmProvider(finalProvider);
    setCurrentChain({ id: chainId, name: chainName });
    
  } catch (error) {
    console.error('Failed to connect:', error);
    addMessage('ConnectEvm', `Error: ${error.message}`);
    // Fallback: usar provider original
    setEvmProvider(provider);
  } finally {
    setIsLoading(false);
  }
}, [passportClient, setIsLoading, addMessage]);
```

### **2. Helper Functions (utils.ts)**

```typescript
// utils/chainConfig.ts

export const SUPPORTED_CHAINS = {
  'zkEVM-mainnet': {
    id: 13371,
    name: 'zkEVM Mainnet',
    rpcUrl: 'https://rpc.immutable.com',
    bundlerUrl: undefined, // Native Passport, não precisa
  },
  'zkEVM-testnet': {
    id: 13473,
    name: 'zkEVM Testnet',
    rpcUrl: 'https://rpc.testnet.immutable.com',
    bundlerUrl: undefined,
  },
  'base-mainnet': {
    id: 8453,
    name: 'Base Mainnet',
    rpcUrl: 'https://mainnet.base.org',
    bundlerUrl: `https://bundler.biconomy.io/api/v3/8453/${process.env.NEXT_PUBLIC_BICONOMY_API_KEY}`,
  },
  'base-sepolia': {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    bundlerUrl: `https://bundler.biconomy.io/api/v3/84532/${process.env.NEXT_PUBLIC_BICONOMY_API_KEY}`,
  },
  'optimism-mainnet': {
    id: 10,
    name: 'Optimism Mainnet',
    rpcUrl: 'https://mainnet.optimism.io',
    bundlerUrl: `https://bundler.biconomy.io/api/v3/10/${process.env.NEXT_PUBLIC_BICONOMY_API_KEY}`,
  },
  'optimism-sepolia': {
    id: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    bundlerUrl: `https://bundler.biconomy.io/api/v3/11155420/${process.env.NEXT_PUBLIC_BICONOMY_API_KEY}`,
  },
};

export const getRpcUrl = (chainId: number): string => {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  return chain.rpcUrl;
};

export const getBundlerUrl = (chainId: number): string | undefined => {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  return chain?.bundlerUrl;
};

export const getChainName = (chainKey: string): string => {
  return SUPPORTED_CHAINS[chainKey]?.name || 'Unknown';
};
```

### **3. MultiChainWorkflow.tsx (novo componente)**

```tsx
import React, { ChangeEvent, useCallback, useState } from 'react';
import { Stack, Box } from 'react-bootstrap';
import { usePassportProvider } from '@/context/PassportProvider';
import Request from '@/components/zkevm/Request';
import CardStack from '@/components/CardStack';
import { useStatusProvider } from '@/context/StatusProvider';
import WorkflowButton from '@/components/WorkflowButton';
import { FormControl, Toggle, Select } from '@biom3/react';
import { ProviderEvent } from '@imtbl/passport';
import { SUPPORTED_CHAINS, getChainName } from '@/utils/chainConfig';

function MultiChainWorkflow() {
  const [showRequest, setShowRequest] = useState<boolean>(false);
  const [selectedChain, setSelectedChain] = useState<string>('zkEVM-mainnet');

  const { isLoading, addMessage } = useStatusProvider();
  const { connectEvm, evmProvider, currentChain } = usePassportProvider();

  const handleRequest = () => {
    setShowRequest(true);
  };

  const handleChainChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedChain(event.target.value);
  };

  const handleConnect = () => {
    const chain = SUPPORTED_CHAINS[selectedChain];
    if (chain) {
      connectEvm(chain.id, chain.name);
    }
  };

  const evmEventHandler = useCallback((eventName: string) => (args: any[]) => {
    addMessage(`Provider Event: ${eventName}`, args);
  }, [addMessage]);

  const onHandleEventsChanged = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      Object.values(ProviderEvent).forEach((eventName) => {
        evmProvider?.on(eventName, evmEventHandler(eventName));
      });
    } else {
      Object.values(ProviderEvent).forEach((eventName) => {
        evmProvider?.removeListener(eventName, evmEventHandler(eventName));
      });
    }
  }, [evmEventHandler, evmProvider]);

  return (
    <CardStack title="MultiChain Workflow">
      <Stack direction="vertical" gap={3}>
        {/* Chain Selector - Only show when not connected */}
        {!evmProvider && (
          <>
            <FormControl>
              <FormControl.Label>Select Chain</FormControl.Label>
              <Select value={selectedChain} onChange={handleChainChange}>
                {Object.entries(SUPPORTED_CHAINS).map(([key, chain]) => (
                  <option key={key} value={key}>
                    {chain.name} ({chain.id})
                  </option>
                ))}
              </Select>
            </FormControl>

            <WorkflowButton
              disabled={isLoading || !selectedChain}
              onClick={handleConnect}
            >
              Connect to {getChainName(selectedChain)}
            </WorkflowButton>
          </>
        )}

        {/* Connected State */}
        {evmProvider && currentChain && (
          <>
            <Box sx={{ color: 'success.main', fontWeight: 'bold' }}>
              ✅ Connected to {currentChain.name} ({currentChain.id})
            </Box>

            <Stack direction="horizontal" style={{ flexWrap: 'wrap' }} gap={3}>
              <WorkflowButton disabled={isLoading} onClick={handleRequest}>
                request
              </WorkflowButton>

              {showRequest && (
                <Request
                  showModal={showRequest}
                  setShowModal={setShowRequest}
                />
              )}

              <FormControl sx={{ alignItems: 'center' }}>
                <Toggle onChange={onHandleEventsChanged} />
                <FormControl.Label>Log out events</FormControl.Label>
              </FormControl>
            </Stack>
          </>
        )}
      </Stack>
    </CardStack>
  );
}

export default MultiChainWorkflow;
```

### **4. Atualizar App.tsx**

```diff
- import ZkEvmWorkflow from '@/components/zkevm/ZkEvmWorkflow';
+ import MultiChainWorkflow from '@/components/zkevm/MultiChainWorkflow';

  return (
    <Container>
-     <ZkEvmWorkflow />
+     <MultiChainWorkflow />
    </Container>
  );
```

---

## 🎯 Benefícios da Nova Abordagem

### **1. Flexibilidade**
- ✅ Usuário escolhe a chain antes de conectar
- ✅ Suporta múltiplas chains sem reconfigurar Environment
- ✅ Fácil adicionar novas chains no futuro

### **2. UX Melhorada**
- ✅ Informação clara de qual chain será usada
- ✅ Indicador visual de chain conectada
- ✅ Fluxo intuitivo: Selecionar → Conectar → Transacionar

### **3. Testabilidade**
- ✅ Testar wallets migradas e nativas na mesma sessão
- ✅ Comparar comportamento entre chains
- ✅ Debug mais fácil com chain visível

### **4. Compatibilidade**
- ✅ zkEVM: Usa provider nativo do Passport
- ✅ Base/Optimism: Usa PassportNexusAdapter automaticamente
- ✅ Fallback gracioso se adapter falhar

---

## 🚀 Implementação Sugerida

### **Fase 1: MVP (Minimal Viable Product)**
1. ✅ Criar `MultiChainWorkflow.tsx`
2. ✅ Adicionar selector com zkEVM Mainnet + Base Mainnet apenas
3. ✅ Testar conectividade básica
4. ✅ Validar com wallets migradas e nativas

### **Fase 2: Expansão**
1. ✅ Adicionar todas as chains suportadas
2. ✅ Implementar cache de última chain selecionada (localStorage)
3. ✅ Adicionar indicadores de gas price / network status
4. ✅ Melhorar error handling com mensagens específicas por chain

### **Fase 3: Refinamento**
1. ✅ Adicionar switch de chain dinâmico (sem desconectar)
2. ✅ Implementar detecção automática de wallet type por chain
3. ✅ Adicionar métricas de performance por chain
4. ✅ Documentação completa da feature

---

## 📝 Notas Técnicas

### **Sobre `wallet_switchEthereumChain`**

O método `wallet_switchEthereumChain` é parte do EIP-3326 e **pode não ser suportado** pelo Passport provider nativamente, pois:

1. **Passport Provider é específico para zkEVM** por padrão
2. **Não há RPC multi-chain nativo** no Passport SDK atual
3. **A chain é definida no momento da inicialização** do `ImmutableConfiguration`

**Alternativas:**

#### **Opção A: Múltiplos Providers** (Mais simples, mas menos eficiente)
```typescript
const [zkEvmProvider, setZkEvmProvider] = useState<Provider>();
const [baseProvider, setBaseProvider] = useState<Provider>();
const [currentChain, setCurrentChain] = useState<'zkEVM' | 'base'>('zkEVM');

// Conectar cria provider específico para a chain
const connectEvm = async (chain: 'zkEVM' | 'base') => {
  if (chain === 'zkEVM') {
    const provider = await passportClient.connectEvm();
    setZkEvmProvider(provider);
  } else {
    const provider = await passportClient.connectEvm();
    const wrapped = adapter.wrapProvider(provider);
    setBaseProvider(wrapped);
  }
  setCurrentChain(chain);
};
```

#### **Opção B: Adapter com Chain Switching** (Mais avançado)
```typescript
// PassportNexusAdapter adiciona suporte a wallet_switchEthereumChain
class PassportNexusAdapter {
  async request(args: RequestArguments) {
    if (args.method === 'wallet_switchEthereumChain') {
      const chainId = parseInt(args.params[0].chainId, 16);
      await this.switchChain(chainId);
      return null;
    }
    // ... resto da lógica
  }

  private async switchChain(chainId: number) {
    // Atualizar configuração do Nexus
    this.config.chainId = chainId;
    this.config.rpcUrl = getRpcUrl(chainId);
    // Recriar clients com nova chain
  }
}
```

**Recomendação:** Começar com **Opção A** (mais simples) e evoluir para **Opção B** se necessário.

---

## ✅ Checklist de Implementação

- [ ] Criar `utils/chainConfig.ts` com configurações de chains
- [ ] Atualizar `PassportProvider.tsx` com `connectEvm` genérico
- [ ] Criar componente `MultiChainWorkflow.tsx`
- [ ] Atualizar `PassportContext` com novos tipos
- [ ] Adicionar variáveis de ambiente necessárias ao `.env.example`
- [ ] Testar com Wallet #1 (Migrated) em Base Mainnet
- [ ] Testar com Wallet #2 (Native Passport) em zkEVM
- [ ] Testar com Wallet #3 (Native Nexus) em Base Mainnet
- [ ] Documentar novos fluxos no README
- [ ] Atualizar screenshots da UI

---

## 🎨 Mockup Visual

```
┌─────────────────────────────────────────────────────┐
│ MultiChain Workflow                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Select Chain                                       │
│  ┌───────────────────────────────────────────────┐ │
│  │ Base Mainnet (8453)                       ▼   │ │
│  └───────────────────────────────────────────────┘ │
│    ↓ Options:                                      │
│    • zkEVM Mainnet (13371)                         │
│    • zkEVM Testnet (13473)                         │
│    • Base Mainnet (8453)                           │
│    • Base Sepolia (84532)                          │
│    • Optimism Mainnet (10)                         │
│    • Optimism Sepolia (11155420)                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │     Connect to Base Mainnet                   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘

      ↓ After Connect ↓

┌─────────────────────────────────────────────────────┐
│ MultiChain Workflow                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ Connected to Base Mainnet (8453)                │
│                                                     │
│  ┌─────────┐  ┌─────────────────┐                  │
│  │ request │  │ □ Log out events │                 │
│  └─────────┘  └─────────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🤔 Considerações Finais

### **Perguntas em Aberto:**

1. **Environment Management:** Como lidar com Environment do Passport (PRODUCTION/SANDBOX) vs Chain selecionada?
   - **Proposta:** Environment define apenas auth/identity layer, chain é independente

2. **Wallet Discovery:** Como detectar automaticamente em qual chain a wallet existe?
   - **Proposta:** Tentar detectar implementação em todas as chains suportadas (paralelo)

3. **Gas Payment:** Se usuário conectar em Base mas wallet só existe em zkEVM?
   - **Proposta:** Mostrar erro claro e sugerir chain correta

4. **Persistência:** Salvar última chain selecionada no localStorage?
   - **Proposta:** Sim, melhor UX

---

## 📚 Referências

- [EIP-3326: Wallet Switch Ethereum Chain](https://eips.ethereum.org/EIPS/eip-3326)
- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193)
- [Passport SDK Documentation](https://docs.immutable.com/docs/zkEvm/products/passport)
- [Biconomy Documentation](https://docs.biconomy.io/)

---

**Status:** 📝 Proposal  
**Autor:** AI Assistant  
**Data:** 2025-01-20  
**Versão:** 1.0  

