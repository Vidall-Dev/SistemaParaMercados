# Sistema de Mercado (PDV)

Este é um sistema de Ponto de Venda (PDV) completo, projetado para ser usado por várias lojas. A aplicação permite que as empresas gerenciem suas vendas, estoque, clientes e muito mais em um ambiente seguro e isolado.

## Tecnologias Utilizadas

Este projeto foi construído com as seguintes tecnologias:

- **Backend:** [Supabase](https://supabase.com/) (Banco de dados PostgreSQL, Autenticação e APIs)
- **Frontend:** [React](https://react.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **UI Components:** [shadcn-ui](https://ui.shadcn.com/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)

## Como Começar

Siga os passos abaixo para configurar e rodar o projeto localmente.

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou outro gerenciador de pacotes (como `yarn` ou `pnpm`)

### Instalação

1.  **Clone o repositório:**

    ```sh
    git clone <URL_DO_SEU_REPOSITORIO_GIT>
    ```

2.  **Navegue até o diretório do projeto:**

    ```sh
    cd <NOME_DO_PROJETO>
    ```

3.  **Configure as variáveis de ambiente:**

    Crie um arquivo chamado `.env` na raiz do projeto e adicione as seguintes variáveis com as suas credenciais do Supabase:

    ```
    VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
    VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_DO_SUPABASE
    ```

4.  **Instale as dependências:**

    ```sh
    npm install
    ```

    *Se encontrar problemas de conflito de dependência, tente o seguinte comando:*
    ```sh
    npm install --legacy-peer-deps
    ```

### Rodando o Projeto

Para iniciar o servidor de desenvolvimento, execute:

```sh
npm run dev
```

A aplicação estará disponível em `http://localhost:5173` (ou em outra porta, se a 5173 estiver em uso).
