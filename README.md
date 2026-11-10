# SmartSplit

Trabalho Prático Incremental de **Empreendedorismo em Sistemas de Informação** — UFLA, 2026/2 — Prof. Johnatan Oliveira.

O SmartSplit é um aplicativo para ajudar moradores de repúblicas e residências compartilhadas a dividir compras de supermercado. O usuário importa os itens da NFC-e pelo QR Code, indica quem participa de cada produto e consulta as parcelas e os reembolsos.

Este repositório reúne a investigação do problema, as evidências coletadas, a proposta de valor, o modelo de negócio, o planejamento e o código do aplicativo. A evolução do trabalho segue o fluxo:

**Problema → Cliente → Evidências → Oportunidade → Proposta de Valor → Modelo de Negócio → MVP → Validação → Viabilidade → Pitch**

## Integrantes

- Felipe Crisóstomo Silva Oliveira
- João Carlos de Castro Ferreira
- João Gabriel Salomão Baldim
- Tobias Maugus Bueno Cougo

## Problema e público

Uma compra conjunta de supermercado pode misturar produtos pessoais, produtos de todos os moradores e produtos consumidos por apenas parte do grupo. Quem organiza o acerto precisa conferir itens, quantidades, preços e descontos, atribuir cada produto aos consumidores e calcular os valores devidos.

O **usuário prioritário** é o morador que organiza essa divisão, podendo também ser quem paga a compra. Os moradores que recebem o resumo são usuários secundários. Pessoas que compram predominantemente de forma individual, mas consideram compartilhar compras, constituem um público adjacente a investigar.

**Campo inicial de investigação:** Lavras/MG, com aproximação a repúblicas, apartamentos compartilhados e comunidades próximas à UFLA. A cidade e a instituição dos oito participantes da pesquisa inicial não foram registradas individualmente.

## Entrega 2 e principais evidências

A Entrega 2 reuniu oito interações exploratórias com moradores de repúblicas e apartamentos compartilhados. Os registros foram reconstruídos retrospectivamente e consolidados em 12/10/2026.

| Achado | Resultado |
| --- | --- |
| Dificuldade na divisão de compras de supermercado | 7 de 8 participantes |
| Responsabilidade total ou parcial pela divisão, percebida como maçante ou difícil de organizar | 7 de 8 participantes |
| Uso de calculadora | 6 de 8; P4 e P8 também usam WhatsApp e relatam confusão nos registros |
| Aprovação da ideia apresentada de automação por QR Code | 8 de 8 participantes |
| Disposição a pagar condicionada a preço baixo | 6 de 8 participantes, sem valor definido |
| Aceitação explícita de anúncios ou versão limitada | Somente P2 |

A amostra é pequena e de conveniência. A aprovação da ideia não comprova redução de tempo, precisão da importação, adoção recorrente ou pagamento efetivo. A decisão da equipe foi **prosseguir com ajustes**, mantendo o foco no supermercado.

## Proposta de valor e modelo de negócio

O SmartSplit ajuda quem organiza compras compartilhadas a **importar os produtos da nota fiscal, atribuir os itens a seus consumidores e consultar valores por pessoa com origem conferível**.

O benefício esperado é reduzir o trabalho manual e melhorar a clareza do acerto. Sua comprovação depende dos testes com usuários e da conferência dos cálculos. A comparação com OCR e a superioridade sobre outras ferramentas não são resultados demonstrados pelas entrevistas.

O modelo comercial em investigação é **freemium**, com acesso gratuito e possível assinatura futura. Preço, recursos pagos e viabilidade econômica permanecem em avaliação. O piloto acadêmico não depende de cobrança ou anúncios.

## MVP e implementação disponível

O fluxo central definido na Entrega 3 é:

1. Cadastrar ou selecionar os participantes.
2. Ler o QR Code de uma NFC-e compatível.
3. Importar e conferir os produtos e o total.
4. Atribuir itens a uma pessoa, a todos ou a um subconjunto.
5. Conferir pendências e definir quem pagou.
6. Consultar as parcelas e os reembolsos.
7. Salvar e reabrir a divisão no histórico local.

O recorte de validação utiliza um organizador operando um aparelho, um pagador por compra e formatos de notas de Minas Gerais verificados pela equipe. A importação depende do portal de consulta e da compatibilidade de sua página; não há promessa de suporte universal a notas de MG ou de outros estados.

O código disponível também contempla recursos adicionais, como despesas manuais, balanço entre participantes, compartilhamento de resumos, dados e QR Code Pix, temas e autenticação local para determinadas ações. Esses recursos complementam a implementação, mas a avaliação do MVP permanece concentrada no fluxo definido na Entrega 3. Gerar uma cobrança ou registrar uma quitação não significa processar uma transferência bancária ou confirmar automaticamente um pagamento.

Os dados são armazenados localmente. Isso permite consultar divisões salvas sem importar a nota novamente, mas não constitui backup ou sincronização entre aparelhos.

## Tecnologias utilizadas

| Componente | Tecnologia |
| --- | --- |
| Aplicativo | React Native 0.81.5 e Expo SDK 54 |
| Linguagem | TypeScript |
| Navegação | Expo Router |
| Leitura e consulta da nota | Expo Camera e React Native WebView |
| Persistência local | AsyncStorage |
| Interface e temas | Styled Components, NativeWind e componentes React |
| Recursos adicionais | Compartilhamento, autenticação local e geração de QR Code Pix |

As dependências e os comandos do projeto estão em [`src/package.json`](src/package.json).

## Como executar o aplicativo

### Pré-requisitos

- Git para clonar o repositório.
- Node.js em uma versão compatível com o Expo SDK 54 e npm.
- Um aparelho Android com Expo Go compatível com o SDK do projeto ou um emulador Android configurado.
- Conexão com a internet para instalar dependências e consultar notas fiscais.

### Instalação

Na primeira utilização, clone o repositório e entre na pasta do aplicativo:

```bash
git clone https://github.com/TobiasMaugus/Trabalho-Empreendedorismo.git
cd Trabalho-Empreendedorismo/src
npm install
```

Se você já estiver na raiz do repositório, basta executar `cd src` e instalar as dependências. **Os comandos npm devem ser executados nessa pasta, onde está o `package.json`, e não na raiz do trabalho.**

### Iniciar pelo Expo

```bash
npm start
```

Esse comando executa `expo start`. Para abrir no aparelho:

1. Conecte o computador e o celular à mesma rede.
2. Abra o Expo Go compatível com o projeto e leia o QR Code exibido no terminal.
3. Aguarde o carregamento do aplicativo.
4. Autorize o acesso à câmera quando solicitado para ler uma nota fiscal.

Se a rede impedir a conexão local, tente iniciar o servidor com túnel:

```bash
npx expo start --tunnel
```

O modo túnel pode solicitar a instalação de uma dependência adicional e exige conexão com a internet. Se o Expo abrir no modo de development build em vez de Expo Go, use a opção indicada no terminal para alternar o modo.

### Emulador Android

Com o emulador aberto e configurado, execute:

```bash
npm run android
```

Também é possível iniciar com `npm start` e pressionar `a` no terminal. O script `android` deste projeto executa `expo start --android`; ele não gera um APK.

### Compatibilidade e compilação nativa

A versão instalada do Expo Go precisa suportar o SDK do projeto. Se surgir um erro de incompatibilidade de SDK ou de módulo nativo, utilize um ambiente compatível ou uma compilação própria; apenas reiniciar o servidor pode não resolver esse tipo de erro.

Para criar e executar uma compilação Android local, com Android Studio, SDK e JDK configurados:

```bash
npx expo run:android
```

Esse comando pode gerar os arquivos nativos Android. A configuração [`src/eas.json`](src/eas.json) também contém um perfil `preview` para APK, caso a equipe opte por distribuir uma versão de avaliação pelo EAS. O uso desse serviço depende de conta e acesso ao projeto configurado.

O projeto possui ainda o comando `npm run web`, mas o fluxo de validação acadêmica prioriza Android. A presença do script não garante equivalência dos recursos de câmera e consulta da nota no navegador.

### Fluxo sugerido para demonstração

Selecione os moradores, importe uma nota compatível, confira os produtos, distribua itens individuais e compartilhados e abra o resumo. Confira a parcela de cada pessoa, o pagador e o total; salve e reabra a divisão no histórico. Uma falha ou divergência deve ser registrada, sem apresentar dados incompletos como uma divisão validada.

## Situação das entregas

As datas abaixo são os marcos previstos no enunciado. A situação indica o material disponível e o trabalho em andamento, não uma nota ou aprovação do professor.

| Etapa | Prazo | Tema | Situação |
| --- | --- | --- | --- |
| 1 | 29/09/2026 | Descoberta do problema e da oportunidade | Documentação disponível |
| 2 | 13/10/2026 | Validação do problema, clientes e mercado | Documentação e registros exploratórios disponíveis |
| 3 | 27/10/2026 | Proposta de valor, modelo de negócio e definição do MVP | Documentação, Canvas, jornada e wireframes disponíveis |
| 4 | 10/11/2026 | MVP funcional e validação da solução | MVP, registros das sessões, gabaritos e relatório consolidado disponíveis |
| 5 | 01/12/2026 | Entrega final e pitch | A preparar |

### Resultados da Etapa 4

Entre 04 e 07/11/2026, a equipe testou o fluxo com cinco organizadores (V01 a V05) e três receptores do resumo (V06 a V08), além de 12 tentativas de importação de NFC-e. Os números abaixo seguem a versão revisada dos registros de 10/11/2026.

| Indicador | Resultado | Meta da Etapa 3 |
| --- | --- | --- |
| Conclusão do fluxo sem ajuda | 4/5 (80%) | Pelo menos 80% |
| Redução mediana de tempo | 69,7% (estimativa, 4 pares) | Pelo menos 25% |
| Parcelas iguais ao gabarito | 5/5 sessões | 100% |
| Facilidade média (1 a 7) | 5,93 | Pelo menos 5,5 |
| Clareza para receptores | 3/3 | Pelo menos 80% |
| Notas importadas completas e corretas | 11/12 (91,7%) | Pelo menos 80% |
| Linhas importadas corretamente | 247/259 (95,4%) | Pelo menos 90% |
| Falhas silenciosas | Não aferido | Nenhuma |

Os tempos no MVP são aproximações informadas pela equipe, não uma nova cronometragem. Antes de considerar o MVP aprovado, ainda é preciso:

- definir uma regra única de arredondamento de centavos, já que a revisão do aplicativo encontrou parcelas que somam um centavo a menos que o total;
- testar o tratamento de falhas;
- realizar o acompanhamento de reutilização em 14 dias.

Problemas, aprendizados e modificações estão no [relatório da Entrega 4](docs/entrega4/Entrega_4.md).

## Documentação

### Entrega 1

- [Descoberta do problema e da oportunidade](docs/entrega1/Entrega_1.md)
- [Versão em PDF](docs/entrega1/Entrega_1.pdf)

### Entrega 2

- [Validação do problema, clientes e mercado](docs/entrega2/Entrega_2.md)
- [Versão em PDF](docs/entrega2/Entrega_2.pdf)

### Entrega 3

- [Síntese da entrega em PDF](docs/entrega3/Entrega_3_Sintese.pdf)
- [Público, proposta de valor e plano de validação](docs/entrega3/Publico_Proposta_Valor_Validacao.md)
- [Modelo de negócio](docs/entrega3/Modelo_Negocio.md)
- [Business Model Canvas corrigido](docs/entrega3/Business_Model_Canvas_SmartSplit.png)
- [Escopo do MVP e planejamento de desenvolvimento](docs/entrega3/Escopo_Planejamento_MVP.pdf)
- [Equipe, Personal Business Model Canvas, jornada e wireframes](docs/entrega3/Equipe_Experiencia_Usuario.md)

### Entrega 4

- [MVP funcional e validação da solução](docs/entrega4/Entrega_4.md)
- [Versão em PDF](docs/entrega4/Entrega_4.pdf)
- [Registro das sessões (planilha)](docs/entrega4/Registro_Sessoes_SmartSplit.xlsx)
- [Gabaritos e resultados dos testes](docs/entrega4/Gabarito%20teste.pdf)
- [Capturas do aplicativo](docs/entrega4/capturas/)

### Aplicativo

- [Código e arquivos do projeto](src/)
- [Dependências e scripts](src/package.json)
- [Configuração do Expo](src/app.json)
- [Configuração de builds](src/eas.json)

## Organização do repositório

| Caminho | Conteúdo |
| --- | --- |
| `README.md` | Visão geral, andamento e instruções de execução |
| `docs/entrega1/` | Descoberta do problema e oportunidade |
| `docs/entrega2/` | Pesquisa exploratória e análise de alternativas |
| `docs/entrega3/` | Proposta de valor, modelo de negócio, equipe, UX e planejamento |
| `docs/entrega4/` | Relatório do MVP e da validação, registros das sessões, gabaritos e capturas |
| `src/` | Raiz do projeto Expo, com `package.json` e configurações |
| `src/src/app/` | Rotas e telas do aplicativo |
| `src/src/components/` | Componentes de interface |
| `src/src/context/` | Estado compartilhado e temas |
| `src/src/utils/` | Funções auxiliares |
| `src/assets/` | Imagens e recursos gráficos |

A documentação e as evidências das próximas etapas serão acrescentadas conforme forem produzidas.
