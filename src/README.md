# SmartSplit 🛒💸

O **SmartSplit** é uma aplicação móvel moderna e intuitiva criada para resolver um problema clássico: **dividir a conta do supermercado e outros gastos de forma justa**.

Acabaram-se as dores de cabeça com calculadoras! Com o SmartSplit, podes atribuir itens de compras a pessoas específicas, registrar gastos variados manuais e gerenciar as finanças do grupo em um só lugar. O aplicativo gera um balanço automático das dívidas (quem deve a quem), facilitando a cobrança exata com links diretos para pagamento via PIX.

## ✨ Funcionalidades

- **Divisão Inteligente e Fracionada:** Permite dividir um único item de nota fiscal por várias pessoas de forma exata (ex: metade de um bolo para o Tobias, metade para a Maria).
- **Gastos Genéricos e Avulsos:** Não se limita apenas a Notas Fiscais! Registre facilmente gastos genéricos manuais, informando valor total, quem pagou e quem participou da divisão.
- **Aba de Balanço (Liquidação Automática):** O aplicativo cruza todos os gastos e pagamentos para calcular a "dívida líquida" (quem deve a quem no balanço final), oferecendo opções para **Quitar Parcialmente**, **Quitar Tudo** ou **Gerenciar** pagamentos individuais.
- **Histórico Unificado e Filtrável:** Guarda o registro de todas as divisões passadas (NFs, Gastos Genéricos e Pagamentos Avulsos) em ordem cronológica. 
- **Cobrança Múltipla em Lote:** No histórico, selecione vários gastos de uma vez e gere uma única mensagem consolidada de cobrança no WhatsApp para todos os devedores.
- **Segurança Biométrica:** Ações críticas, como apagar todos os dados ou registrar a quitação de débitos, são protegidas por autenticação biométrica (Face ID / Touch ID).
- **Gestão de Perfis com QR Code PIX:** Cria perfis com cores personalizadas. Acesse rapidamente o QR Code do PIX de qualquer pessoa cadastrada diretamente pela lista de perfis.
- **Integração PIX Completa:** Gera ligações/links diretos de pagamento PIX e QR Codes baseados no valor exato que cada pessoa deve.
- **Partilha Limpa (WhatsApp):** Exporta o resumo da conta com formatação limpa (bullet points `•`) e os links de pagamento diretamente para o WhatsApp ou outros mensageiros.
- **Suporte a Dark Mode:** Interface totalmente adaptativa (Light/Dark) baseada na preferência do sistema operativo ou escolhida manualmente.

## 🛠️ Tecnologias Utilizadas

A aplicação foi desenvolvida com foco em performance, tipagem estática, segurança e componentes reutilizáveis:

- **[React Native](https://reactnative.dev/)** & **[Expo](https://expo.dev/)** (Framework Mobile)
- **[Expo Router](https://docs.expo.dev/router/introduction/)** (Navegação baseada em ficheiros/tabs)
- **[TypeScript](https://www.typescriptlang.org/)** (Tipagem forte e segurança no código)
- **[Styled Components](https://styled-components.com/)** (Estilização avançada e gestão dinâmica de temas)
- **[Lucide React Native](https://lucide.dev/)** (Ícones bonitos e consistentes)
- **Expo Local Authentication** (Segurança via biometria do dispositivo)
- **AsyncStorage** (Persistência de dados locais como histórico, balanço, perfis e preferências)

## 🚀 Como Executar o Projeto

Segue os passos abaixo para correr a aplicação no teu ambiente local:

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado.
- Aplicação **Expo Go** instalada no teu telemóvel (iOS ou Android) ou um emulador configurado.

### Instalação

1. Clona este repositório:
   ```bash
   git clone https://github.com/o-teu-utilizador/smartsplit.git
   ```

2. Entra na pasta do projeto:
   ```bash
   cd smartsplit
   ```

3. Instala as dependências:
   ```bash
   npm install
   ```

4. Inicia o servidor do Expo:
   ```bash
   npx expo start
   ```

5. Lê o QR Code gerado no terminal usando a app **Expo Go** no teu telemóvel (ou carrega "a" para Android / "i" para iOS se tiveres emuladores configurados).
