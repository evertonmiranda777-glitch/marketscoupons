-- Disk IO: o UPDATE que preenche o IP do clique varria a tabela inteira.
--
-- CONTEXTO: o browser nao consegue ler o proprio IP, entao a edge function
-- `facebook-capi` preenche depois, com PATCH em
--   coupon_clicks?event_id=eq.<id>&ip=is.null
-- O desenho esta certo — o problema e que NAO HAVIA INDICE em `event_id`.
-- Resultado: 5.654 UPDATEs, cada um varrendo 8.042 linhas / 15 MB.
-- No pg_stat_statements era o 2o maior consumidor de disco do projeto.
--
-- Indice PARCIAL de proposito (`where ip is null`): a PATCH so procura linha
-- ainda sem IP. Assim o indice cobre so o que interessa, fica pequeno (328 kB
-- contra a tabela de 15 MB) e ENCOLHE sozinho conforme as linhas sao preenchidas.
--
-- CONCURRENTLY pra nao travar a gravacao de clique durante a criacao — esse e o
-- caminho que sustenta a atribuicao de venda, nao pode parar.
--
-- Conferido depois de criar: EXPLAIN do UPDATE passou de Seq Scan para
-- ModifyTable > Index Scan.

create index concurrently if not exists idx_cc_event_id_sem_ip
  on public.coupon_clicks (event_id)
  where ip is null;
