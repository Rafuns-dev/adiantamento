# Especificação de Segurança (Payload-First TDD) — AMETA Equipes

## 1. Invariantes de Dados
1. **Usuários (`usuarios/{uid}`)**: Apenas usuários ativos (`ativo == true`) acessam o painel. Apenas `admin` cria/edita/exclui perfis ou altera `role`.
2. **Cadastros Públicos (`cadastros/{id}`)**:
   - Criação pública aceita **estritamente os 16 campos do formulário** + `status == 'Pendente'` + `criadoEm == request.time`.
   - Leitura (`get`, `list`) restrita a usuários internos (`interno()` = `admin`, `operador`, `financeiro`, `vistoria_nota`, `vistoria_ameta`).
   - Atualização restrita à `equipe()` (`admin`, `operador`, `financeiro`); exclusão restrita ao `admin()`.
3. **Notas Fiscais (`notas/{id}`)**:
   - Criação apenas por `vistoria_nota` (`eNota()`) ou `admin()`, exigindo `status == 'Emitida'`, `criadoPorUid == request.auth.uid`, `criadoEm == request.time` e existência do prestador em `cadastros`.
   - Edição por `vistoria_nota` apenas em notas que ele mesmo criou (`resource.data.criadoPorUid == request.auth.uid`) e enquanto estiverem com `status == 'Emitida'`.
   - Equipe `vistoria_ameta` (`eComp()`) só pode atualizar `['status', 'atualizadoEm']` para `'Comprovada'`.
   - Exclusão apenas `admin()`.
4. **Comprovantes (`comprovantes/{id}`)**:
   - Criação apenas por `vistoria_ameta` (`eComp()`) ou `admin()`, exigindo existência da nota em `notas/{notaId}`, `criadoPorUid == request.auth.uid`, `criadoEm == request.time`, tipo permitido (`application/pdf`, `image/jpeg`, `image/png`) e tamanho `<= 10 MB`.
   - Atualização proibida (`allow update: if false;`).
   - Exclusão apenas `admin()`.
5. **Auditoria (`auditoria/{id}`)**:
   - Criação permitida para `interno()` (inclui downloads, notas, comprovantes).
   - Leitura restrita a `interno()`.
   - Atualização e exclusão proibidas.

## 2. "Dirty Dozen" Payloads (Tentativas de Ataque Bloqueadas)
1. **Visitante anônimo lendo `notas`** -> `PERMISSION_DENIED` (`interno()` exige login ativo).
2. **Visitante anônimo lendo `comprovantes` ou `cadastros`** -> `PERMISSION_DENIED`.
3. **Formulário público com 17º campo (`adminOverride: true`) em `cadastros`** -> `PERMISSION_DENIED` (`hasOnly` bloqueia campos extras).
4. **Formulário público omitindo campo obrigatório em `cadastros`** -> `PERMISSION_DENIED` (`hasAll` exige todos os 16 campos + status + criadoEm).
5. **`vistoria_nota` tentando criar comprovante em `comprovantes`** -> `PERMISSION_DENIED`.
6. **`vistoria_ameta` tentando criar nota em `notas`** -> `PERMISSION_DENIED`.
7. **`vistoria_ameta` tentando anexar comprovante com `notaId` inexistente** -> `PERMISSION_DENIED` (`exists(/databases/.../notas/$(notaId))`).
8. **`vistoria_nota` tentando editar nota criada por outro usuário** -> `PERMISSION_DENIED`.
9. **`vistoria_nota` tentando editar nota já com status `'Aguardando comprovante'` ou `'Comprovada'`** -> `PERMISSION_DENIED`.
10. **`vistoria_ameta` tentando editar ou excluir um comprovante** -> `PERMISSION_DENIED`.
11. **Usuário comum tentando escalar próprio `role` para `'admin'` em `usuarios/{uid}`** -> `PERMISSION_DENIED`.
12. **Injeção de ID malicioso (>128 chars) ou string gigante (>maxLength) em campos de texto** -> `PERMISSION_DENIED`.
