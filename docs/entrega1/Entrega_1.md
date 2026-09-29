# Entrega 1 — Descoberta do problema e da oportunidade

**Disciplina:** Empreendedorismo em Sistemas de Informação — UFLA, 2026/2  
**Prazo:** 29/09/2026

## 1. Identificação do grupo

- **Nome provisório do empreendimento:** SmartSplit.
- **Integrantes:** Felipe Crisóstomo Silva Oliveira; João Carlos de Castro Ferreira; João Gabriel Salomão Baldim; Tobias Maugus Bueno Cougo.
- **Repositório:** https://github.com/TobiasMaugus/Trabalho-Empreendedorismo

## 2. Problemas considerados

| Problema candidato                                                                                  | Público provável                                                             | Por que investigar                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Atribuir produtos individuais e compartilhados de uma compra de supermercado paga por uma pessoa | Estudantes e jovens adultos que dividem residência e fazem compras conjuntas | A nota pode conter muitos itens, quantidades e descontos; repartir o total igualmente pode cobrar de alguém por produtos que não consumiu. |
| B. Acompanhar reembolsos pendentes depois de gastos domésticos pagos por moradores diferentes       | Moradores de repúblicas e apartamentos compartilhados                        | Acertos dispersos em mensagens e comprovantes podem dificultar lembrar quem pagou.                                                         |
| C. Conciliar critérios de divisão de despesas da moradia, como limpeza, gás e consumo compartilhado | Pessoas que dividem moradia                                                  | Pode haver desacordo sobre o que é coletivo e qual regra usar.                                                                             |

**Problema selecionado:** candidato A. A situação é específica, observável em compras reais e permite investigar o esforço envolvido em atribuir itens e calcular as parcelas.

## 3. Problema escolhido e delimitação

Quando moradores de uma mesma casa compram produtos de supermercado em uma única transação, uma pessoa pode pagar a conta inteira, embora alguns itens sejam pessoais e outros sejam compartilhados por todos ou apenas parte do grupo. Para acertar os valores, é necessário consultar a nota, identificar itens, preços, quantidades e descontos, decidir quem participa de cada item e calcular quanto cada pessoa deve. Fazer isso manualmente pode exigir tempo, gerar erros de conta e causar desacordos.

**Contexto inicial:** repúblicas e apartamentos compartilhados por estudantes em Lavras (MG), sobretudo quando a compra gera NFC-e e é paga por um morador. Lavras foi escolhida como campo inicial por permitir ao grupo encontrar e acompanhar participantes próximos à UFLA. A ocorrência frequente de compras conjuntas em repúblicas e a intensidade da dificuldade permanecem hipóteses.

**Recorrência esperada:** associada à frequência das compras conjuntas de cada residência; ainda não há medida confiável da frequência nem do tempo gasto na divisão.

**Consequências possíveis:** cálculo incorreto, distribuição percebida como injusta, demora no reembolso, necessidade de conferir valores e desconforto entre moradores.

**Fora do recorte inicial:** todas as finanças da residência, pagamento de aluguel e contas públicas, compras individuais sem acerto posterior e divisão de restaurante ou viagem. Esses casos podem ser considerados mais tarde, se a pesquisa indicar valor.

## 4. Público-alvo preliminar

- **Usuário inicial prioritário:** morador que faz ou organiza uma compra conjunta, paga a nota e precisa calcular e comunicar os valores individuais.
- **Outros usuários envolvidos:** moradores que recebem o resumo e conferem sua parte.
- **Características relevantes:** residência com pelo menos duas pessoas, produtos pessoais e compartilhados na mesma compra, uso de telefone celular e algum método atual de acerto.
- **Cliente ou pagador potencial:** o próprio morador organizador ou, possivelmente, a residência como grupo. **Não há evidência de disposição a pagar; modelo de receita fica em aberto.**
- **Acesso para pesquisa:** estudantes da UFLA que dividem moradia em Lavras, sem presumir que todos os estudantes pertençam ao público-alvo.

## 5. Evidências secundárias e seus limites

1. A UFLA informou **10.430 estudantes regularmente matriculados na graduação** em abril de 2026, considerando a universidade. O dado demonstra um universo local de recrutamento, **não** mede quantos dividem moradia nem quantos fazem compras conjuntas. Fonte: https://ufla.br/noticias/ensino/18457-ufla-registra-recorde-historico-de-matriculas-na-graduacao-em-2026-1
2. A UFLA mantém programa de moradia estudantil para o câmpus Lavras. Isso demonstra a existência institucional de moradia compartilhada estudantil, sem quantificar o segmento específico que enfrenta o problema. Fonte: https://ufla.br/noticias/institucional/18279-prape-abre-inscricoes-para-o-programa-de-moradia-estudantil-2026-1
3. A SEF/MG informa que consumidores podem consultar NFC-e pela chave de acesso ou pelo QR Code impresso no documento. Isso sustenta a viabilidade de investigar a nota digital como fonte de dados, mas **não garante** extração automatizada estável nem acesso sem verificação humana. Fonte: https://portalsped.fazenda.mg.gov.br/spedmg/nfce/Perguntas-Frequentes/respostas_i/index.html
4. O Splitwise Pro oferece leitura de recibos por OCR e atribuição dos itens a pessoas mediante assinatura. A própria empresa já apontou a necessidade de melhorar o OCR fora dos Estados Unidos. Há relato público de usuário sobre itens lidos incorretamente em contas com mais de 20 produtos. São indícios de uma dificuldade possível, **não uma medida de que o Splitwise falhe frequentemente em notas brasileiras**. Fontes: https://blog.splitwise.com/2019/07/09/splitwise-redesigned/ ; https://kb.splitwise.com/pro/what-is-splitwise-pro ; https://feedback.splitwise.com/forums/162446-general/suggestions/37311688-allow-edit-of-single-item-in-itemize-scanned-recei
5. A impressão térmica desgastada e a baixa qualidade da imagem podem prejudicar a leitura óptica de recibos. Notas longas também exigem avaliar enquadramento e reconhecimento de todos os itens. A comparação específica com NFC-e brasileira deve ser testada com amostras reais, sem atribuir uma taxa de erro não medida ao concorrente. Fonte: https://www.mdpi.com/2227-7390/14/1/187

**Lacuna central:** nenhuma dessas fontes comprova a frequência, o esforço, o incômodo ou a disposição de usar ou pagar pelo SmartSplit entre moradores de Lavras. Esses pontos exigem pesquisa primária na Entrega 2.

## 6. Como o problema é resolvido hoje e alternativas

| Alternativa                         | O que permite                                                                                     | Limite a investigar no recorte                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Papel, calculadora e PIX            | Ler os itens, somar partes e transferir valores                                                   | Tempo de conferência, erros e desgaste; medir com participantes.                                                                                                                                                                                                                                                                                                 |
| Fotos da nota, WhatsApp e planilhas | Compartilhar itens e registrar contas                                                             | Pode exigir digitação ou conciliação manual; observar o uso real.                                                                                                                                                                                                                                                                                                |
| Tricount                            | Registrar gastos de grupo, quem pagou e parcelas customizadas                                     | Verificar com usuários se atende à atribuição dos produtos de uma NFC-e. Fonte: https://tricount.com/en-us/                                                                                                                                                                                                                                                      |
| Splitwise Pro                       | Digitalizar recibos por OCR e discriminar itens para atribuição; recurso oferecido por assinatura | Testar com notas brasileiras longas e com impressão desgastada; comparar preço efetivo, precisão e esforço. Relatos pontuais de erros não demonstram frequência geral. Fontes: https://kb.splitwise.com/pro/what-is-splitwise-pro ; https://feedback.splitwise.com/forums/162446-general/suggestions/37311688-allow-edit-of-single-item-in-itemize-scanned-recei |

**Oportunidade preliminar:** investigar uma solução voltada ao Brasil que use os dados da NFC-e acessíveis pelo QR Code, atribua produtos pessoais e coletivos e ofereça uma opção de menor custo ao usuário. A vantagem de precisão, a cobertura de notas de diferentes estados e a possibilidade de preço inferior dependem de testes e de uma análise de custos; ainda não são resultados demonstrados.

## 7. Hipóteses iniciais e critérios para revisão

- **H1 — problema:** uma parcela relevante dos moradores entrevistados realiza compras conjuntas com itens de propriedade diferente e precisa fazer acertos item a item. Investigar frequência e último episódio concreto.
- **H2 — cliente:** o morador que organiza ou paga a compra sente a maior carga de trabalho e aceita experimentar outra forma de divisão. Comparar relatos de pagadores e de quem recebe cobranças.
- **H3 — necessidade:** os métodos atuais geram tempo de conferência, dúvidas ou erros suficientes para motivar mudança. Perguntar quanto demorou a última divisão e observar evidências, sem induzir respostas.
- **H4 — valor preliminar:** importar os itens pela NFC-e e atribuí-los a moradores reduz esforço e aumenta a clareza em relação ao procedimento atual. Testar somente depois de compreender o problema, com tarefas reais e comparação de tempo, conclusão e erros.
- **H5 — viabilidade técnica:** uma proporção útil das notas do contexto escolhido permite extrair itens e valores corretamente. Testar amostra de notas de estabelecimentos distintos, ocultando dados pessoais. Captcha, mudanças de layout, descontos e itens por peso são riscos.
- **H6 — adoção/negócio:** se o problema for frequente e doloroso, usuários podem reutilizar o produto; eventual disposição a pagar é uma hipótese separada e posterior, não um fato.
- **H7 — diferenciação:** em compras com notas longas ou impressão desgastada, consultar itens pela NFC-e pode exigir menos correções que fotografar e reconhecer o texto por OCR. Comparar os dois caminhos com as mesmas notas e registrar itens corretos, erros e tempo total.
- **H8 — preço:** uma oferta focada em compras compartilhadas no Brasil pode ser mais acessível que a assinatura do Splitwise Pro. Verificar preço vigente para usuários brasileiros, custo operacional e disposição a pagar antes de definir cobrança.

**Decisão prevista:** prosseguir com o recorte se houver relatos repetidos e específicos de dificuldade, acesso a notas representativas e sinal de que o processo proposto oferece ganho real. Se as compras conjuntas forem raras ou a divisão atual for satisfatória, reduzir ou alterar público e problema antes de ampliar o aplicativo.

## 8. Plano de validação para a Entrega 2 (13/10/2026)

**Amostra pretendida:** pelo menos **8 interações válidas** com moradores que realmente dividem residência e já participaram de compras conjuntas; buscar **ao menos 5 entrevistas semiestruturadas**, conforme a orientação do trabalho. Procurar moradores de casas diferentes, com papéis de pagador/organizador e de participante, evitando concentrar a amostra em uma única república. Recrutar por contatos estudantis, centros acadêmicos, grupos de moradia e indicações, com participação voluntária.

**Triagem:** “Você mora com outras pessoas? Nas últimas semanas fizeram alguma compra de supermercado conjunta? Quem pagou e como decidiram a parte de cada um?” Registrar quem não se enquadra, mas não contabilizar como interação válida com o público-alvo.

**Roteiro inicial, sem mostrar o aplicativo:**

1. Conte como vocês costumam comprar alimentos e produtos da casa.
2. Lembre a última compra em que itens pessoais e compartilhados saíram na mesma nota. O que aconteceu?
3. Quem pagou? Como decidiram quais itens pertenciam a quem?
4. Como calcularam e comunicaram os valores? Que ferramentas usaram?
5. Quanto tempo levou? Houve conferência, dúvida, erro ou atraso no pagamento?
6. Com que frequência esse tipo de compra e acerto acontece?
7. O que funciona bem no método atual? O que mudaria nele?
8. Já experimentaram algum aplicativo ou planilha? Por que continuaram ou deixaram de usar?
9. Se houver consentimento, podemos observar uma nota recente **com CPF, dados pessoais e chave de acesso ocultados no registro da pesquisa** e entender como vocês fariam a divisão?

**Registro:** codificar participantes como P01 a P08; anotar perfil, data, situação recente, método, frequência relatada, dificuldade observada, citações curtas autorizadas e hipóteses contrariadas. Evitar coletar CPF, chave de acesso integral, endereço, telefone, dados bancários ou imagens de notas sem necessidade. Não publicar gravações sem autorização.

**Responsabilidades previstas:** a divisão inicial de papéis entre os integrantes está apresentada na seção 12. Todos participarão da pesquisa e da revisão dos resultados.

**Resultados a produzir:** roteiro final, registros anonimizados das 8 interações, síntese de padrões e divergências, comparação mais detalhada de alternativas, hipóteses mantidas/rejeitadas e decisão fundamentada de prosseguir ou pivotar.

## 9. Justificativa da relevância do problema

A divisão de compras com itens individuais e coletivos envolve mais decisões do que repartir o total da nota pelo número de moradores. É necessário distinguir produtos pessoais, produtos compartilhados por todos e produtos compartilhados apenas por parte do grupo. Quantidades e descontos podem tornar o cálculo mais trabalhoso, especialmente em compras com muitos itens.

Uma divisão incorreta pode fazer um morador pagar por produtos que não lhe pertencem, exigir conferências e dificultar os reembolsos. A possibilidade de reduzir esse esforço e tornar os valores mais transparentes justifica investigar o problema. O contexto universitário de Lavras oferece acesso a potenciais participantes, permitindo estudar situações reais dentro do semestre.

O potencial empreendedor está em oferecer uma experiência voltada às compras compartilhadas no Brasil, com uso dos dados da NFC-e e possibilidade de preço acessível. A intensidade da dificuldade, a adoção da solução e sua viabilidade comercial serão verificadas com o público-alvo.

## 10. Três possíveis soluções tecnológicas

### 10.1. Aplicativo móvel com leitura do QR Code da NFC-e

O usuário lê o QR Code da nota, acessa a consulta digital e importa os produtos e valores por extração dos dados apresentados na página. Em seguida, atribui os itens a um ou mais moradores, define o pagador e obtém o resumo da divisão.

**Vantagem potencial:** aproveitar os dados digitais sem depender da legibilidade de todo o texto impresso, desde que o QR Code ou o endereço de consulta esteja acessível. **Limitações:** conexão com a internet, disponibilidade da consulta, verificações humanas e diferenças entre páginas de estados distintos.

### 10.2. Aplicativo com fotografia da nota e reconhecimento óptico de caracteres (OCR)

O usuário fotografa a nota e o aplicativo reconhece nomes, quantidades e preços. Após a conferência e eventuais correções, os itens são atribuídos aos moradores para calcular as parcelas.

**Vantagem potencial:** permitir leitura de recibos que não disponibilizem consulta digital compatível. **Limitações:** qualidade da imagem, impressão desgastada, enquadramento de notas longas e necessidade de corrigir erros de reconhecimento.

### 10.3. Sistema web de lançamento manual e divisão colaborativa

Um sistema acessível pelo navegador permite cadastrar a compra, inserir itens e valores e convidar os moradores para indicar suas participações. O sistema calcula as parcelas e mantém um registro compartilhado da divisão.

**Vantagem potencial:** independência de portais fiscais e de reconhecimento de imagem, com acesso por diferentes dispositivos. **Limitações:** esforço de digitação, possibilidade de erros de entrada e necessidade de participação do grupo para conferir os dados.

A solução com QR Code é a direção preliminar para o SmartSplit, pela possibilidade de reduzir a transcrição dos itens e aproveitar a infraestrutura de NFC-e brasileira. A escolha definitiva e o escopo do MVP serão orientados pelos resultados da validação.

## 11. Critérios para escolha do problema

- **Delimitação:** o problema corresponde a uma situação concreta, a divisão de uma compra de supermercado com produtos individuais e compartilhados.
- **Acesso ao público-alvo:** a proximidade com estudantes da UFLA e moradores de Lavras facilita o recrutamento para entrevistas e observação.
- **Possibilidade de validação:** é possível investigar compras recentes, métodos atuais, tempo de divisão, dúvidas e necessidade de correções.
- **Potencial de recorrência:** o problema pode acompanhar a rotina de compras da residência; sua frequência será medida na pesquisa.
- **Adequação ao semestre:** o fluxo central pode ser delimitado e testado sem exigir uma plataforma completa de gestão financeira.
- **Software como componente central:** a recuperação dos itens, sua atribuição e o cálculo das parcelas dependem diretamente da solução tecnológica.
- **Potencial de diferenciação:** a consulta à NFC-e e o foco em compras compartilhadas no Brasil permitem investigar uma proposta de valor específica.

## 12. Divisão inicial de papéis entre os integrantes

A distribuição proposta para o início do projeto estabelece responsáveis principais por cada frente, com participação dos demais integrantes nas entrevistas, na análise e na revisão das entregas.

| Integrante                       | Papel inicial                       | Responsabilidades principais                                                                                                                         |
| -------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Felipe Crisóstomo Silva Oliviera | Pesquisa com usuários               | Organizar o recrutamento e a agenda, conduzir entrevistas e registrar situações reais de divisão de compras.                                         |
| João Carlos de Castro Ferreira   | Pesquisa de mercado                 | Levantar concorrentes e alternativas, reunir fontes secundárias e comparar funcionalidades, custos e limitações.                                     |
| João Gabriel Salomão Baldim      | Documentação e análise              | Consolidar registros anonimizados, identificar padrões e divergências e organizar a documentação e as evidências no repositório.                     |
| Tobias Maugus Bueno Cougo        | Investigação técnica e prototipação | Avaliar as alternativas tecnológicas, investigar a recuperação de dados da NFC-e e planejar o fluxo de prototipação para testar a proposta de valor. |

As responsabilidades serão ajustadas conforme os resultados da pesquisa e as necessidades das próximas etapas. A definição e a revisão do problema, da proposta de valor e do MVP serão realizadas pela equipe.

## 13. Riscos percebidos no início do projeto

| Risco                                                            | Possível impacto                                                                    | Abordagem inicial                                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| O problema ser pouco frequente ou pouco relevante                | Baixa motivação para adotar uma nova solução                                        | Investigar episódios recentes, frequência e satisfação com os métodos atuais.                                     |
| Amostra concentrada em uma única residência ou círculo de amigos | Resultados pouco representativos do recorte escolhido                               | Recrutar moradores de casas diferentes e ouvir organizadores e participantes das compras.                         |
| Dependência de portais de consulta da NFC-e                      | Falhas de importação por indisponibilidade, verificação humana ou mudança de layout | Avaliar notas de estabelecimentos distintos e delimitar inicialmente a consulta de Minas Gerais.                  |
| Erros na interpretação de quantidades, preços e descontos        | Parcelas incorretas e perda de confiança                                            | Comparar dados importados com a nota e conferir se a soma das parcelas corresponde ao valor da compra.            |
| Dificuldade para definir a participação em itens compartilhados  | A automação do cálculo não resolver o desacordo entre moradores                     | Investigar as regras usadas nas residências e permitir atribuições individuais e a subconjuntos de participantes. |
| Concorrentes atenderem satisfatoriamente ao público              | Diferenciação insuficiente                                                          | Comparar esforço, precisão e custo com as alternativas efetivamente utilizadas pelos participantes.               |
| Baixa disposição a pagar ou custo operacional elevado            | Inviabilidade de uma oferta de menor preço                                          | Separar a validação de utilidade da pesquisa de preço e estimar custos antes de definir cobrança.                 |
| Exposição de dados pessoais nas notas e registros                | Comprometimento da privacidade dos participantes                                    | Usar registros anonimizados e ocultar dados pessoais nas evidências compartilhadas.                               |
| Expansão excessiva do escopo e concentração de tarefas           | Atrasos e dificuldade de concluir a validação no semestre                           | Priorizar o fluxo principal, distribuir atividades e acompanhar responsáveis e prazos no repositório.             |
