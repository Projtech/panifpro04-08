# Funções Edge do Supabase para PanificaçãoPRO

Este diretório contém as Edge Functions que são executadas no servidor Supabase para melhorar a performance da aplicação.

## Função: generate-pdf

Esta função gera PDFs no servidor, reduzindo a carga no navegador do cliente.

### Benefícios

- **Processamento no servidor**: Todo o trabalho pesado é feito no servidor, liberando recursos do navegador
- **Menor tráfego de rede**: Apenas o PDF final é transferido, não todos os dados brutos
- **Melhor escalabilidade**: O servidor geralmente tem mais recursos que o navegador do cliente
- **Consistência**: A geração é padronizada independentemente do dispositivo do usuário

### Como implantar

1. Certifique-se de ter a CLI do Supabase instalada:
   ```
   npm install -g supabase
   ```

2. Faça login na sua conta Supabase:
   ```
   supabase login
   ```

3. Implante a função:
   ```
   supabase functions deploy generate-pdf --project-ref=SEU_ID_DO_PROJETO
   ```

### Como usar

A função é chamada automaticamente pelo frontend quando o usuário solicita a exportação de uma lista de produção para PDF. O código relevante está em `src/services/exportService.ts`.

```typescript
// Exemplo de uso
const { data: pdfData, error } = await supabase.functions.invoke('generate-pdf', {
  body: { listId, companyId, listName }
});

if (error) throw error;
if (!pdfData) throw new Error('Erro ao gerar PDF no servidor');

// Converter o arraybuffer para Blob
const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });

// Iniciar download
saveAs(pdfBlob, `${listName}.pdf`);
```
