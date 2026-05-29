# Guia de Setup iOS — Solviss

Este guia cobre tudo que você precisa para rodar o app no iOS Simulator e gerar um build de TestFlight.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| macOS | Sonoma 14+ | — |
| Xcode | 16+ | App Store |
| Node.js | 20+ | `brew install node` |
| Bun | qualquer | `brew install bun` |
| CocoaPods | 1.15+ | `brew install cocoapods` |
| Conta Apple Developer | Paga ($99/ano) | developer.apple.com |

---

## 1. Primeira vez — gerando o projeto iOS

```bash
# 1. Instala dependências
bun install

# 2. Gera o build web (pasta dist/)
bun run build

# 3. Adiciona a plataforma iOS (cria a pasta ios/ no repositório)
npx cap add ios

# 4. Sincroniza o build web com o projeto nativo
npx cap sync ios
```

Depois do `cap add ios`, a pasta `ios/` aparece na raiz. **Faça commit dela** — ela contém o projeto Xcode.

---

## 2. Permissões — Info.plist

O iOS exige textos explicativos para cada permissão. Edite `ios/App/App/Info.plist` e adicione:

```xml
<!-- Câmera (scanner de cupom) -->
<key>NSCameraUsageDescription</key>
<string>O Solviss usa a câmera para escanear cupons fiscais e registrar transações automaticamente.</string>

<!-- Galeria (anexar comprovantes) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>O Solviss acessa suas fotos para que você anexe comprovantes de pagamento.</string>

<!-- Notificações locais (lembretes de vencimento) -->
<!-- Gerenciado automaticamente pelo @capacitor/local-notifications -->
```

> Sem essas strings, o app é rejeitado na App Store Review.

---

## 3. Abrir no Xcode

```bash
npx cap open ios
```

Isso abre o `ios/App/App.xcworkspace` no Xcode.

### Configurações no Xcode

1. **Bundle Identifier**: `com.solviss.app` (igual ao `appId` no `capacitor.config.ts`)
2. **Signing & Capabilities**:
   - Team: selecione sua conta Apple Developer
   - Signing Certificate: Xcode gerencia automaticamente
3. **Deployment Target**: iOS 16.0 (cobre ~98% dos dispositivos ativos)
4. **Display Name**: `Solviss`

---

## 4. Rodar no Simulador

```bash
# Build web + sync + abre simulador (tudo em um comando)
bun run ios
```

Ou direto do Xcode: selecione um simulador e pressione ▶

---

## 5. Fluxo de desenvolvimento com Live Reload

Para ver mudanças no código sem precisar rebuildar:

```bash
# Terminal 1 — servidor Vite
bun run dev

# Descubra seu IP local
ipconfig getifaddr en0   # ex: 192.168.1.100
```

Descomente no `capacitor.config.ts`:
```ts
server: {
  url: 'http://192.168.1.100:5173',
  cleartext: true,
},
```

```bash
# Terminal 2 — sync e abre o simulador
npx cap sync ios && npx cap open ios
```

> ⚠️ **Nunca faça commit do `capacitor.config.ts` com `server.url` ativo** — isso faria o app de produção apontar para seu servidor local.

---

## 6. Build para TestFlight

```bash
# 1. Build de produção
bun run build

# 2. Sync
npx cap sync ios
```

No Xcode:
1. Selecione **Any iOS Device (arm64)** como destino
2. Menu **Product → Archive**
3. Na janela Organizer → **Distribute App → TestFlight**

---

## 7. Ícones e Splash Screen

### Ícone do app
Coloque um PNG **1024×1024px** (sem transparência, sem cantos arredondados — o iOS faz isso) em:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```
Use o script do Capacitor para gerar todos os tamanhos:
```bash
npx @capacitor/assets generate --ios
# Requer: resources/icon.png (1024x1024) e resources/splash.png (2732x2732)
```

### Splash Screen
Coloque em `resources/splash.png` (2732×2732px, fundo `#f7f6f2`, logo centralizado).

```bash
npx @capacitor/assets generate --ios
```

---

## 8. Scripts npm disponíveis

```bash
bun run build          # build web (dist/)
bun run ios            # build + sync + abre Xcode
bun run ios:sync       # só sincroniza sem abrir Xcode
bun run ios:device     # live-reload no dispositivo físico
```

---

## 9. Estrutura de pastas após setup

```
solviss-financas-pessoais/
├── dist/              ← build web (gerado, não commitar)
├── ios/               ← projeto Xcode (commitar)
│   └── App/
│       ├── App/
│       │   ├── Info.plist          ← permissões aqui
│       │   └── Assets.xcassets/    ← ícones e splash
│       └── App.xcworkspace         ← abrir este no Xcode
├── src/               ← código React
├── capacitor.config.ts
└── docs/
    └── ios-setup.md   ← este arquivo
```

---

## 10. Problemas frequentes

| Erro | Causa | Solução |
|---|---|---|
| `pod install` falha | CocoaPods desatualizado | `sudo gem install cocoapods` |
| Tela branca no simulador | `dist/` vazio | `bun run build` antes do sync |
| App trava no splash | `server.url` ativo sem servidor rodando | Comente o bloco `server` no config |
| Câmera não pede permissão | Faltam strings no Info.plist | Ver seção 2 acima |
| `cap sync` não encontra iOS | `npx cap add ios` não foi executado | Execute uma vez e faça commit da pasta `ios/` |
