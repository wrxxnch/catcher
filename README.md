# Pega Ladrão
![SiqueiraPegaLadrão](prints/Pega_ladrão.gif)

# Usage

```bash
npm install -g firebase-tools
npm install
npm run dev
```

Recentemente vi um post do Pedro Teixeira ([link do repositório](https://github.com/PedroHBessa/backscan)) no LinkedIn onde ele contou como conseguiu obter, por meio de uma pagina simples, a localização de um criminoso que estava lhe ameaçando e pedindo dinheiro. Comentei que tinha feito algo parecido só que utilizando a plataforma Firebase, e como me pediram para deixar publico o repositório resolvi adaptá-lo para esse cenário disponibilizar aqui, além disso, publiquei no Firebase então vocês poderão usar.

Em resumo, com essa aplicação voce vai poder gerar comprovantes de Pix falso e enviar para o criminoso, caso ele acesse o link e conceda as permissões (somente para caso da localização e foto) você conseguirá obter a localização, IP, informações do dispositivo e até fotos do mesmo.

## Como usar

Como eu disse, disponibilizei online para qualquer pessoa usar. Criei dois domínios apontando para a mesma aplicação, **pega-ladrao-d9d04.web.app** é o domínio que você vai usar para gerar e obter os acessos ao comprovante e o **comprovante-br-gov-bcb-pix-cdba8.web.app** é que você vai enviar para criminoso.

Para gerar um comprovante acesso esse endereço:

[https://pega-ladrao-d9d04.web.app/_gerar](https://pega-ladrao-d9d04.web.app/_gerar)
<p>no seu caso acesse o ip gerado exemplo : http://localhost:5176/_gerar</p>
<p>n esqueça de colocar os valores da firebase no .env.example e renomear para .env (ou pode colocar os valores diretamente no firebase.js) </p>
<img width="503" height="41" alt="image" src="https://github.com/user-attachments/assets/fc0b70ed-b3fd-4528-9b03-8af35474e78c" />
<p>Coloque o projectId no seu comprovante no .env,recomendo usar algo como Comprovante no nome do projeto no firebase </p>




# Firebase login
```bash
npm install firebase
firebase login
```

# Regras Firebase
definas as regras de read and write para true:
![rulesfirebase](prints/firebaseRules.jpg)

---
# 🚀firebase deploy
Antes de fazer o deploy, gere a build do projeto:
```bash
npm run build
```
Deploy em ambos os sites:
```bash
firebase deploy --only hosting:pega-ladrao,hosting:comprovante
```

---

# Acessos
Se você não assinou o Storage do firebase,os resultados apenas vão ser retornados no firestore database
<img width="925" height="661" alt="image" src="https://github.com/user-attachments/assets/5c1ce424-fab8-496f-8cec-8f17699b65b5" />


<img src="./prints/1.png" style="width:150px;"/>
<img src="./prints/2.png" style="width:150px;"/>

Preencha o formulário e clique em gerar, se tudo foi devidamente preenchido você será redirecionado para uma página parecida com essa **https://pega-ladrao-d9d04.web.app/acessos?id=6wlAXyhqWCXxqLVVwv5m**.

<img src="./prints/3.png" style="width:150px;"/>

Nesta página voce vai poder copiar o link do comprovante gerado para poder enviar, além disso é nessa pagina que será listado os acessos ao link com as informações. Essa pagina e atualizada a cada 30 segundos, onde ela busca da base do Firebase por novos acessos.

<img src="./prints/4.png" style="width:150px;"/>
<img src="./prints/5.png" style="width:150px;"/>

## Contribuição

Devido o tempo corrido só fiz os modelos de comprovante, do banco Bradesco e do Next. Se você deseja contribuir desenvolvendo algum, ou ajudando na documentação, correção de Bugs, ideias ou de qualquer outra forma sinta-se livre para enviar um pull request ou abrir uma issue.
