# Prompt di handover — Semantic Zotero Knowledge Graph

> Copia e incolla **l'intero contenuto di questo file** come primo messaggio di
> una nuova sessione LLM. Questo handover fotografa la conclusione della fase
> alpha al 13 luglio 2026, ma il codice e Git rimangono sempre la fonte di verità
> più aggiornata.

---

## Aggiornamento più recente — fase beta (22 luglio 2026, leggi prima questo)

**Questa sezione integra e, dove diverge, prevale sullo snapshot alpha più in
basso.** Codice e Git restano la fonte di verità: all'avvio controlla sempre
`git log --oneline -12` e `git status`.

### Stato Git
Il lavoro della fase beta è su `main`, pubblicato su `origin/main` fino al commit
`890992c` (`Revert "Improve large graph interaction performance"`). Il contenuto
del repository a questo commit coincide con `e63d9fe` (`Handle Zotero deletions
and reconcile viewer data`): il tentativo grafico `8ef4c81` è stato annullato
integralmente su richiesta dell'utente. Il commit precedente di hardening è
`df6c68f` (`Harden local serving and sync recovery`).

### Cosa è stato fatto in questa sessione
Tutto seguendo le regole del progetto (pipeline scientifica intatta, dati privati
fuori da Git, bundle ricostruito dopo ogni modifica a `web/app-sigma.js`).

1. **Metadati modificati → ri-embedding (limite alpha #2 RISOLTO).** `sync`
   riconosce i paper il cui *titolo o abstract* è cambiato e li ri-embedda
   (`pipeline._partition_by_change` + `store.upsert` con `merge_insert`, senza
   duplicare righe). Un semplice cambio di tag/collezione NON viene ripagato.
2. **Clustering corretto.** `min_samples` era `3` e collassava quasi tutti i paper
   in **un unico tema**; portato a **`1`** in `clustering.py` e
   `pipeline.rebuild_map` → ~70 temi coerenti. Aggiunto un test di regressione.
3. **Tema sempre scuro.** Rimossa la palette chiara e `prefers-color-scheme` in
   `web/style.css`. NB: era stato aggiunto e poi **rimosso** un pulsante
   chiaro/scuro, perché il rendering del grafo non era ottimizzato per lo sfondo
   chiaro.
4. **Logo e nome nella barra laterale.** `assets/logo.png` ora è l'icona a
   cervello-rete; la sidebar mostra logo + **"SZKG"** + sottotitolo.
5. **Pannello di dettaglio del paper (in basso a destra).** Al clic su un nodo:
   titolo, autori, **rivista · anno**, tema, numero collegamenti, badge weak,
   **abstract completo scorrevole**, link "Open in Zotero".
6. **Nuovo contratto dati locale `data/metadata.json`** (privato, ignorato da Git):
   `key → {title, authors, journal, year, abstract}`, letto **solo dal frontend**
   per il pannello. **Non** tocca LanceDB né `graph.json`. Popolato da una lettura
   Zotero **in sola lettura** (`sync_embeddings(force_full=True)`, usata da
   `refresh`); la lettura Zotero è gratuita, ma paper nuovi o testo modificato
   possono comunque generare embedding OpenAI a pagamento.
7. **`zotero_source.py`** raccoglie **autori, rivista, anno** (`format_authors`,
   `extract_publication`, `extract_year`) — **solo per la visualizzazione, MAI
   embeddati**: il testo semantico resta *titolo + abstract*.
8. **Archi più lisci (aliasing ridotto).** Spessore aumentato
   (`minEdgeThickness 1.1`, `size ~0.8–1.7`) + **MSAA 4×** forzato sui layer WebGL
   (patch di `getContext` in `createRenderer`). Il picking usa framebuffer
   separati, quindi hover/click NON sono toccati.
9. **Documentazione English-only.** Eliminato `docs/USER_GUIDE.it.md`; prosa
   "Italian"→"legacy" in README/ARCHITECTURE/`data_migration`; tradotti 2 commenti
   italiani nel fallback Cytoscape. **MANTENUTI di proposito**: le **stopword
   italiane** in `clustering.py` (la libreria contiene paper in italiano) e il
   **migratore**. Sezione "migrazione" rimossa dal README; nuovo diagramma README.
10. **Server locale ristretto (limite beta #1 RISOLTO).** `serve.py` usa una
    allowlist: espone soltanto viewer, logo e i quattro JSON necessari. `.env`, Git e
    LanceDB non sono più raggiungibili via HTTP; aggiunti header browser difensivi
    e un test loopback senza rete esterna.
11. **Sync riprendibile e JSON atomici (limite #4 RISOLTO).** Tutti i JSON sono
    pubblicati tramite file temporaneo + replace; grafo e cluster condividono una
    revisione verificata anche dai renderer. `state.json` avanza solo dopo la
    mappa e il sync recupera chiavi presenti in cache ma assenti dal grafo.
12. **Guardie embedding (limite #11 RISOLTO).** LanceDB rifiuta dimensioni o
    modelli incompatibili; la richiesta OpenAI passa esplicitamente le 1.536
    dimensioni e valida forma/numero dei vettori restituiti.
13. **Robustezza incrementale.** Jitter deterministico (limite #7 risolto), voce
    `unclassified` creata quando serve (limite #12 risolto) e fallback per
    etichette su testi non latini.
14. **Cancellazioni Zotero (limite #3 RISOLTO).** `sync` legge in sola lettura sia
    gli item cambiati/in cestino sia `/deleted?since=...`; rimuove le chiavi da
    LanceDB, metadata, nodi, archi e assegnazioni. Un full read riconcilia anche
    gli item non più idonei. L'identità user/group salvata nello stato impedisce
    di applicare per errore le cancellazioni di una libreria a un'altra.
15. **Refresh browser completo (limite #6 RISOLTO).** Sigma e Cytoscape ora
    riconciliano esattamente nodi, archi, attributi e coordinate, mantenendo
    camera, ricerca e selezioni ancora valide; non serve più il reload dopo
    `refresh`.
16. **Link group library (limite #10 RISOLTO).** Il nuovo `data/viewer.json`
    contiene soltanto tipo e ID non segreti della libreria; entrambi i renderer
    usano `zotero://select/groups/{groupID}/items/{key}` per i gruppi e il formato
    `library/items` per la libreria personale.
17. **Tentativo prestazioni grafiche ANNULLATO.** Il commit `8ef4c81` nascondeva
    gli archi durante pan/zoom, attivava il picking degli archi solo dopo una
    selezione, aggregava gli aggiornamenti Graphology e modificava il fallback
    Cytoscape. L'utente non ha gradito il risultato: `890992c` ha ripristinato
    byte per byte `e63d9fe`. **Non reintrodurre queste scelte come gruppo** senza
    una nuova proposta circoscritta e una validazione visiva esplicita.

L'utente ha confermato la validazione funzionale delle modifiche fino a
`e63d9fe`, prima del tentativo grafico poi annullato.

### Snapshot dati locale aggiornato
- **1837 paper**, **~70 temi** (dopo la correzione del clustering).
- `data/metadata.json`: 1622 con autori, 1582 con rivista, 1619 con anno,
  **1295 con abstract → 542 senza abstract**.
- Principio confermato: un paper **senza abstract viene embeddato dal solo
  titolo** (non escluso), con rappresentazione più debole; è escluso solo se manca
  il **titolo**. Elenca i mancanti con `python data_quality.py` (locale, gratis).
- `data/state.json`, `data/viewer.json` e `data/metadata.json` sono presenti
  localmente e restano esclusi da Git.

### Prossimi obiettivi
1. **[PRIORITÀ] Resa grafica: archi sottilissimi E senza aliasing**, come il sito
   di riferimento **Bevy Constellation** (`https://crates.rugaex.com`). Stato: per
   togliere l'aliasing abbiamo dovuto **ispessire** gli archi; il MSAA hardware da
   solo NON basta, perché Sigma disegna gli archi come quad con sfumatura shader
   (l'MSAA leviga la geometria, non la sfumatura interna). Ipotesi sul riferimento:
   usa **canvas 2D** (anti-aliasing nativo del browser), fattibile con ~250 archi
   ma non coi nostri ~10.000. Opzione da valutare: **supersampling** (rendering a
   risoluzione maggiore → linee sottili e lisce, ma più costo GPU, da bilanciare
   con la fluidità).
2. **Stile ispirato a Bevy (interfaccia).** Analizzato con l'utente; per ora
   applicato **solo** il pannello di dettaglio. Idee non ancora fatte: tipografia
   monospace/pannelli riquadrati, legenda dei tipi di arco, etichette a livelli di
   dettaglio. **La palette dei temi NON va resa monocroma** (i colori sono
   informazione).
3. **Fluidità del grafo** (1837 nodi / ~9954 archi): il tentativo combinato del
   commit `8ef4c81` è stato provato e poi annullato perché il risultato non è
   piaciuto all'utente. Lo stato approvato mantiene gli archi visibili durante
   pan/zoom e il picking attivo. `?edges=straight` resta soltanto un confronto
   diagnostico già disponibile. Valutare in futuro una modifica alla volta,
   preservando un rollback immediato e chiedendo una verifica visiva.
4. **Limiti beta ancora aperti** (lista più in basso): prezzi OpenAI (#13), test
   browser end-to-end (#14), lock dipendenze (#15),
   installer/onboarding (#16), scalabilità (#17).

### Note operative
- Dopo ogni modifica a `web/app-sigma.js`: `npm run build:web` e **committa il
  bundle** `web/dist/app-sigma.bundle.js` (la CI verifica che coincida col sorgente).
- Per verificare il grafo **serve il browser reale dell'utente**: il pannello di
  anteprima usato in sessione spesso non dà larghezza al canvas ("Container has no
  width"), quindi non renderizza la mappa.
- Leggere Zotero è **sola lettura e gratis**, ma `refresh` o una chiamata diretta
  a `sync_embeddings(force_full=True)` possono usare OpenAI e avere un costo se
  trovano paper nuovi o testo modificato. Spiegare sempre questa distinzione
  prima di eseguirli.

---

Sei il nuovo assistente responsabile dello sviluppo di **Semantic Zotero
Knowledge Graph (SZKG)**. Stai prendendo in consegna un'applicazione locale che
trasforma una libreria Zotero in una mappa semantica interattiva di paper.

Il progetto si trova in:

```text
/Users/nicola/Desktop/semantic2
```

Repository pubblica:

```text
https://github.com/internalempire/szkg
```

Licenza: **MIT**. La fase alpha di sviluppo e test è conclusa. Il proprietario
del progetto ha verificato manualmente che il renderer Sigma/WebGL funzioni bene
sulla libreria reale; la pipeline, il fallback Cytoscape, la migrazione dei dati,
i test locali e la CI GitHub sono operativi.

## Come devi collaborare con l'utente

L'utente non è programmatore. Devi quindi:

- comunicare con lui in italiano e con parole semplici;
- spiegare che cosa fa ogni componente e perché esiste;
- tradurre il gergo tecnico quando è necessario usarlo;
- anticipare i rischi e fermarti a spiegare i trade-off non ovvi prima di una
  decisione importante o difficilmente reversibile;
- distinguere sempre tra verifiche locali, chiamate di rete e operazioni che
  possono generare costi;
- non chiedergli di scegliere dettagli puramente tecnici quando puoi adottare
  in sicurezza una soluzione ragionevole;
- proporre un piano prima di cambiamenti architetturali rilevanti e attendere la
  sua conferma quando le alternative cambiano materialmente il risultato;
- usare inglese per codice, nomi di variabili, commenti, messaggi dell'app e
  documentazione pubblica; la precedente `docs/USER_GUIDE.it.md` è stata rimossa;
- commentare il codice in inglese chiaro. Le sole parole italiane ammesse nel
  codice sono dati linguistici intenzionali, come le stopword, e le vecchie
  chiavi riconosciute dal migratore.

Non esporre mai il contenuto di `.env`, chiavi API, titoli/abstract privati o
vettori. Non aggiungere `data/` a Git. Non forzare push, non riscrivere la
cronologia pubblica e non eliminare modifiche dell'utente senza autorizzazione.

## Prima di compiere qualsiasi modifica

1. Leggi questo file per intero.
2. Leggi per intero:
   - `README.md`;
   - `docs/ARCHITECTURE.md`;
   - i file direttamente interessati dal nuovo obiettivo.
3. Controlla almeno:

   ```bash
   pwd
   git status --short --branch
   git log --oneline --decorate -8
   git remote -v
   ```

4. Ricorda che l'utente può avere modifiche locali o commit eseguiti da GitHub:
   preservali e integra il tuo lavoro senza sovrascriverli.
5. Se questo handover e il codice divergono, considera il codice e la cronologia
   Git come fonte di verità e segnala la discrepanza.
6. Prima di chiamare Zotero o OpenAI, spiega se l'operazione è di sola lettura e
   se può avere un costo. I test automatici non devono usare rete o segreti.
7. Dopo una modifica, esegui controlli proporzionati al rischio e riferisci
   chiaramente cosa hai verificato e cosa non hai potuto verificare.

## Obiettivo del progetto

SZKG aiuta un ricercatore a vedere la struttura concettuale della propria
libreria Zotero. Usa titolo e abstract per rappresentare ogni paper come un
vettore semantico; collega i paper simili, individua gruppi tematici, assegna
etichette automatiche e calcola una posizione bidimensionale. Il risultato è
esplorabile nel browser come una rete di isole colorate.

Principi del progetto:

- **local-first**: database vettoriale, grafo, cluster e stato restano sul
  computer dell'utente;
- **Zotero read-only**: l'app non modifica mai la libreria Zotero;
- **costo controllato**: un paper già presente nella cache non viene embeddato
  di nuovo;
- **aggiornamento rapido e ricostruzione precisa**: `sync` privilegia stabilità e
  velocità, `refresh` ricalcola l'organizzazione globale;
- **pipeline indipendente dal renderer**: Python produce JSON comuni a Sigma e
  Cytoscape;
- **interfacce sostituibili**: sorgente dei paper e fornitore degli embedding
  sono separati dal resto della pipeline;
- **privacy del repository**: dati personali, chiavi e vettori sono esclusi da
  Git.

## Funzionalità disponibili all'utente

### Comandi principali

```bash
python app.py refresh
python app.py sync
python app.py serve
```

- `refresh`: sincronizza gli embedding mancanti, poi ricostruisce grafo, temi,
  etichette e layout dell'intera cache. Riusa gli embedding esistenti, ma le
  isole possono spostarsi perché la struttura globale viene ricalcolata.
- `sync`: chiede a Zotero modifiche, elementi nel cestino e cancellazioni
  successive alla versione salvata; aggiunge i paper nuovi, ri-embedda solo
  titolo/abstract modificati e rimuove localmente gli elementi non più idonei,
  senza ricalcolare il layout globale. È il flusso quotidiano.
- `serve`: migra eventuali vecchi JSON, avvia un server HTTP solo su
  `127.0.0.1`, prova le porte `8000–8019` e apre il browser. Le risposte hanno
  `Cache-Control: no-store` per evitare file obsoleti.

`build_map.py` è un entry point verboso storico per una ricostruzione completa e
un rapporto testuale. I nuovi utenti devono preferire `python app.py refresh`.

### Interazioni della mappa

L'interfaccia permette di:

- fare pan e zoom, usare i pulsanti `+`, `−` e fit;
- passare sul nodo per vedere il titolo;
- selezionare un paper e vedere titolo, tema, numero di collegamenti e link
  `zotero://` per aprirlo in Zotero;
- evidenziare il suo vicinato semantico;
- cliccare uno degli archi evidenziati e aprire un secondo pannello con il paper
  collegato;
- cercare nei titoli;
- fare anteprima o bloccare l'evidenziazione di un tema dalla legenda;
- mostrare o nascondere singoli temi tramite checkbox;
- mostrare o nascondere le assegnazioni deboli;
- rileggere i JSON dal pulsante **Refresh data**, riconciliando nodi, archi,
  attributi e coordinate;
- ripristinare la vista completa.

Sigma mostra etichette HTML fluttuanti per i 14 temi più grandi. I singoli nodi
non hanno etichette sempre visibili, per evitare sovraccarico grafico.

Il pulsante **Refresh data** non avvia Python, Zotero o OpenAI e non modifica i
JSON: rilegge i file già generati. È adatto sia dopo `sync` sia dopo `refresh` e
non richiede più un reload per applicare coordinate o archi aggiornati.

## Architettura in una vista

```text
Zotero Web API (sola lettura)
  -> zotero_source.py: Paper normalizzati
  -> embeddings.py: vettori OpenAI da 1.536 dimensioni
  -> store.py: cache locale LanceDB
       -> graph.py: grafo k-nearest-neighbor con similarità coseno
       -> clustering.py: PCA -> HDBSCAN -> etichette c-TF-IDF
       -> layout.py: PCA -> t-SNE -> coordinate 2D
  -> pipeline.py: orchestration di sync e refresh
  -> data/graph.json + data/clusters.json + data/metadata.json
     + data/viewer.json + data/state.json
  -> Graphology + Sigma.js/WebGL nel browser
       oppure Cytoscape.js come fallback CPU
```

## Componenti Python e loro responsabilità

### `config.py`

Legge `.env`, valida la configurazione e restituisce oggetti tipizzati. Variabili
richieste:

```dotenv
ZOTERO_LIBRARY_ID=...
ZOTERO_LIBRARY_TYPE=user
ZOTERO_API_KEY=...
OPENAI_API_KEY=...
```

`ZOTERO_LIBRARY_TYPE` accetta `user` o `group`. Non stampare mai i valori
segreti.

### `zotero_source.py`

- Definisce il dataclass `Paper` e l'interfaccia astratta `ZoteroSource`.
- L'implementazione corrente è `PyzoteroSource`.
- Legge elementi top-level tramite Zotero Web API.
- Esclude `attachment`, `note` e `annotation` e gli elementi senza titolo.
- Usa `since=<library version>` per l'incrementale, include il cestino e consulta
  il log read-only `/deleted` per propagare le rimozioni nella cache locale.
- Il testo semantico corrente è soltanto `title + abstract`; PDF, full text,
  autori, tag e note non entrano nell'embedding.

La sorgente astratta è stata scelta per poter aggiungere in futuro, per esempio,
un lettore SQLite locale senza riscrivere il resto.

### `embeddings.py`

- Definisce l'interfaccia `EmbeddingProvider`.
- Implementazione corrente: OpenAI `text-embedding-3-small`, 1.536 dimensioni.
- Batch API interni da 100 testi e fino a 6 retry automatici.
- Restituisce anche i token dichiarati dal provider.

L'interfaccia separata permette di sostituire OpenAI con un altro servizio o un
modello locale senza cambiare storage, clustering, grafo o viewer.

### `costs.py`

Conta i token con `tiktoken`, stima il costo e mostra abbastanza decimali da non
nascondere costi molto piccoli. I prezzi sono una tabella locale e possono
diventare obsoleti: prima di fare previsioni economiche precise, confrontarli con
il listino ufficiale corrente.

### `store.py`

Usa LanceDB locale in `data/lancedb/`. La tabella `papers` contiene:

- chiave Zotero;
- titolo e abstract;
- tipo e versione dell'item;
- vettore;
- modello, token, data dell'embedding;
- `cluster_id` riservato, attualmente inizializzato a `-1`.

La chiave Zotero è l'identità della cache. Questo evita costi duplicati: una
modifica a titolo o abstract forza un upsert con un nuovo embedding, mentre
modifiche a tag, collezioni o soli metadati di visualizzazione non lo fanno.

### `graph.py`

Costruisce un grafo di similarità non orientato:

- `k=8` vicini per paper;
- soglia di similarità coseno `0.5`;
- la ricerca k-NN è asimmetrica, ma gli endpoint vengono ordinati per deduplicare
  A→B e B→A;
- viene mantenuta la similarità più alta osservata;
- il peso è arrotondato a quattro decimali.

La scelta evita il grafo completo, che sarebbe costoso e illeggibile.

### `clustering.py`

1. PCA riduce gli embedding a un massimo di 50 dimensioni.
2. HDBSCAN trova gruppi densi senza richiedere in anticipo il numero di temi.
3. Il c-TF-IDF sceglie le parole distintive del gruppo.
4. Gli outlier HDBSCAN possono ricevere un tema tramite voto pesato dei vicini,
   ma soltanto se la similarità supera `0.5`.

Valori correnti: `minimum_topic_size=5`, `min_samples=1`. Un `min_samples` più
alto, su una libreria monotematica, faceva collassare tutti i paper in un unico
cluster gigante; `1` mantiene separati i temi densi reali. Le etichette usano
stopword inglesi e italiane perché i metadati possono essere multilingue. Un
paper assegnato dopo essere stato considerato rumore è marcato
`weak_assignment=true`; se non esiste evidenza sufficiente resta nel cluster
`-1`, cioè `unclassified`.

Le etichette vengono calcolate sui soli membri densi, così gli outlier aggiunti
non diluiscono il significato del tema.

### `layout.py`

Calcola le coordinate in Python con PCA seguito da t-SNE, poi applica un fattore
di scala 14. I random seed sono fissi. Per meno di cinque paper usa soltanto
PCA. Eseguire il layout in Python evita una simulazione di forze bloccante a ogni
apertura del browser.

### `pipeline.py`

Implementa il principio **“fast now, precise later”**:

- `sync_embeddings()` legge cambiamenti e cancellazioni Zotero, aggiorna la
  cache e restituisce la versione coperta senza avanzare ancora lo stato;
- `rebuild_map()` ricalcola grafo, clustering e layout sull'intera cache;
- `add_to_map_incrementally()` aggiunge nuovi paper, rimuove quelli cancellati e
  aggiorna nodi, archi e assegnazioni con jitter deterministico;
- `sync_library()` riconcilia cache e mappa, poi avanza atomicamente lo stato.

Se i JSON della mappa non esistono, l'incrementale passa automaticamente a una
ricostruzione completa.

## Contratti dei dati generati

Tutto `data/` è privato, locale e ignorato da Git.

### `data/graph.json`

```json
{
  "revision": "same-publication-id",
  "nodes": [
    {
      "id": "ZOTERO_KEY",
      "title": "Paper title",
      "cluster": 3,
      "cluster_label": "airway, ventilation, pressure",
      "weak_assignment": false,
      "x": 12.34,
      "y": -56.78
    }
  ],
  "edges": [
    {
      "source": "ZOTERO_KEY",
      "target": "OTHER_KEY",
      "weight": 0.7342
    }
  ]
}
```

Gli archi sono non orientati. Il cluster `-1` indica i paper non classificati.

### `data/clusters.json`

```json
{
  "revision": "same-publication-id",
  "topics": [
    {
      "id": 3,
      "label": "airway, ventilation, pressure",
      "keywords": ["airway", "ventilation", "pressure"],
      "paper_count": 42
    }
  ],
  "assignments": {
    "ZOTERO_KEY": 3
  }
}
```

### `data/state.json`

```json
{
  "last_zotero_version": 12345,
  "zotero_library_id": "1234567",
  "zotero_library_type": "user"
}
```

È la versione della libreria Zotero, non la versione dell'app. Tipo e ID
impediscono di applicare per errore lo stato incrementale di una libreria a
un'altra.

### `data/metadata.json`

Mappa ogni chiave Zotero ai campi di sola visualizzazione `title`, `authors`,
`journal`, `year` e `abstract`. Non contiene vettori e non modifica il testo
semantico salvato in LanceDB.

### `data/viewer.json`

```json
{
  "library_id": "1234567",
  "library_type": "group"
}
```

Contiene soltanto l'identità non segreta necessaria per costruire il link desktop
Zotero corretto. Non deve mai contenere la chiave API.

`graph.json` e `clusters.json` condividono la stessa `revision`; i renderer
rifiutano coppie appartenenti a pubblicazioni diverse e riprovano brevemente.

Preserva questi contratti quando modifichi pipeline o renderer. Se devi
cambiarli, pianifica esplicitamente una migrazione compatibile.

## Migrazione automatica dallo schema italiano

Le prime versioni usavano chiavi JSON italiane. `data_migration.py` converte:

| Chiave storica | Chiave corrente |
| --- | --- |
| `debole` | `weak_assignment` |
| `temi` | `topics` |
| `etichetta` | `label` |
| `parole_chiave` | `keywords` |
| `numero_paper` | `paper_count` |
| `assegnazioni` | `assignments` |
| `ultima_versione` | `last_zotero_version` |

La migrazione viene chiamata da `serve`, `sync` e `refresh`; non apre LanceDB,
non usa la rete e non ha costi API. Scrive un file temporaneo completo e lo
sostituisce atomicamente. È idempotente: il secondo passaggio non cambia nulla.
Se coesistono chiave vecchia e nuova, la nuova ha precedenza.

La compatibilità automatica è stata scelta per non chiedere operazioni manuali
agli utenti esistenti. Il prezzo è mantenere nel codice un piccolo strato con i
vecchi nomi italiani; non eliminarlo come “traduzione incompleta”.

## Frontend e renderer

### Sigma.js/WebGL — predefinito

File sorgente: `web/app-sigma.js`. Bundle browser offline:
`web/dist/app-sigma.bundle.js`.

- Graphology conserva struttura e attributi del grafo.
- Sigma.js 3 disegna con WebGL/GPU.
- `@sigma/node-border` crea bordo e alone del nodo selezionato.
- `@sigma/edge-curve` disegna archi curvi.
- I colori dei temi usano passi di 137,5° sulla ruota HSL, per separare temi
  consecutivi.
- Il colore di un arco è la media RGB dei temi ai due estremi.
- Curvatura e verso visivo dipendono da un hash stabile dell'ID dell'arco.
- Nodi e archi mantengono dimensioni sostanzialmente costanti in pixel durante
  lo zoom.
- I reducer Sigma trasformano stato di ricerca, selezione e visibilità in
  attributi WebGL senza modificare i JSON.
- Gli archi estranei vengono nascosti durante una selezione, ma restano visibili
  normalmente durante pan e zoom.

Il browser carica il bundle già compilato: gli utenti finali non hanno bisogno
di Node.js. Dopo ogni modifica a `web/app-sigma.js`, eseguire e committare:

```bash
npm run build:web
```

### Cytoscape.js — fallback conservato

`web/app-cytoscape.js` e `web/vendor/` mantengono il vecchio renderer CPU. Si
attiva con:

```text
?renderer=cytoscape
```

Sigma è stato scelto per le prestazioni su migliaia di elementi; Cytoscape è
stato conservato come paracadute per browser/WebGL incompatibili e per confronto
diagnostico. Entrambi leggono gli stessi JSON e riusano lo stesso HTML/CSS: la
pipeline Python non è duplicata.

`web/loader.js` sceglie il renderer. Con Sigma si può aggiungere
`?edges=straight` per confrontare a scopo diagnostico gli archi dritti con quelli
curvi. Non esiste ancora un passaggio automatico a Cytoscape se WebGL fallisce.

### Perché il layout non è nel renderer

Le coordinate vengono calcolate una volta dalla pipeline e salvate nei JSON.
Questo mantiene Sigma e Cytoscape coerenti, evita attese a ogni caricamento e
lascia al browser soltanto il compito per cui la GPU è utile: disegnare e
interagire.

## Script diagnostici

- `diagnose_zotero.py`: conta tutti gli item visibili, elenca collezioni e
  mostra item grezzi; usa Zotero in sola lettura, non OpenAI.
- `test_zotero.py`: legge otto paper idonei e mostra i metadati essenziali; usa
  Zotero in sola lettura.
- `data_quality.py`: trova nella cache titoli simili a nomi di file e abstract
  mancanti; è locale, di sola lettura e gratuito.
- `neighbors.py "parte del titolo"`: spiega tema, stato debole, archi e otto
  vicini semantici di un paper; è locale e gratuito.
- `test_embedding.py`: prova la catena Zotero → OpenAI → LanceDB su cinque
  paper; può effettuare una richiesta a pagamento e aggiungere vettori alla
  cache locale. Non eseguirlo senza rendere esplicita questa conseguenza.

## Dipendenze e build

Runtime Python dichiarato: 3.12 o superiore. Dipendenze principali:

- `pyzotero`, `python-dotenv`;
- `openai`, `tiktoken`;
- `lancedb`, `pyarrow`;
- `numpy`, `scikit-learn`.

Le dipendenze Python usano versioni minime, non un lock completo. Le dipendenze
frontend sono invece fissate in `package-lock.json`: Sigma 3.0.3, Graphology
0.26.0, edge-curve 3.1.0, node-border 3.0.0 ed esbuild 0.28.1.

## Test e CI

Comandi di verifica standard:

```bash
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m compileall -q -x '(^|/)(\.venv|node_modules|web/vendor)(/|$)' .
npm test
npm run build:web
git diff --exit-code -- web/dist/app-sigma.bundle.js
```

La suite automatica corrente contiene **34 test network-free**. Copre core
scientifico e layout piccolo, migrazione, provider embedding, upsert e
compatibilità LanceDB, metadati, pubblicazione atomica/revisionata, recupero del
sync, cancellazioni Zotero, identità user/group e allowlist del server. Restano
fuori i test browser end-to-end e le chiamate reali Zotero/OpenAI.

`.github/workflows/ci.yml` esegue i test con Python 3.12 e Node 20, controlla il
frontend e verifica che il bundle committato corrisponda al sorgente. Ha
`contents: read`. Non esiste più un workflow dinamico per il badge “Vibe Coded”:
il badge del README è statico al 100%.

## Stato verificato alla chiusura dell'alpha

- Repository pubblica MIT: `internalempire/szkg`.
- Baseline funzionale precedente a questo handover: commit `21d2592`.
- Il logo è conservato in `assets/logo.png`; al momento dello snapshot il
  README non lo incorpora più, in seguito a una modifica effettuata da GitHub.
- Codice, commenti e interfaccia sono in inglese; allo snapshot alpha esisteva
  una guida italiana, poi rimossa durante la beta.
- Sigma/WebGL è predefinito e verificato manualmente dall'utente.
- Cytoscape resta disponibile come fallback.
- I test Python, i controlli JavaScript, la ricostruzione del bundle e la CI
  GitHub sono passati.
- È stato verificato via HTTP che pagina, loader, bundle Sigma, script
  Cytoscape, vendor e JSON rispondano correttamente.
- La migrazione reale ha convertito `graph.json` e `clusters.json`; un secondo
  passaggio ha restituito nessuna modifica.
- `.env`, `data/`, `.venv/` e `node_modules/` sono ignorati da Git e non sono
  stati pubblicati.

Snapshot locale non sensibile al momento dell'handover:

- 1.818 nodi;
- 9.846 archi;
- 56 temi classificati più la voce `unclassified`;
- 112 paper non classificati;
- 686 assegnazioni deboli;
- 54 nodi isolati;
- coordinate finite per tutti i nodi;
- `data/state.json` non era ancora presente nello snapshot alpha.

Questa assenza è soltanto storica: nello stato beta corrente `state.json` è
presente e il flusso incrementale è stato validato dall'utente.

Il test HTTP non equivale a un test end-to-end automatizzato del canvas. La
validazione interattiva dell'alpha è stata manuale.

## Scelte già prese e motivazioni

Non cambiare queste decisioni incidentalmente:

1. **Zotero Web API invece di accesso diretto al database desktop**: supporta
   librerie user/group e versioni incrementali senza modificare Zotero.
2. **Embedding remoto invece di modello locale**: setup semplice e rapido su un
   laptop; il costo è l'invio di titolo/abstract a un servizio esterno.
3. **LanceDB locale**: cache vettoriale persistente senza server o cloud.
4. **Due modalità, `sync` e `refresh`**: velocità/stabilità quotidiana contro
   qualità globale periodica.
5. **HDBSCAN**: il numero di temi non va scelto a priori e gli outlier restano
   espliciti.
6. **Assegnazioni deboli visibili**: un paper di frontiera non viene presentato
   come membro denso del tema.
7. **Layout Python persistito**: nessun layout costoso al caricamento e parità
   tra renderer.
8. **Sigma/WebGL predefinito**: prestazioni e fluidità GPU su migliaia di nodi e
   archi.
9. **Cytoscape conservato**: fallback e possibilità di confronto, accettando un
   piccolo costo di manutenzione duplicata del solo frontend.
10. **Bundle Sigma committato**: l'utente finale non deve installare npm; gli
    sviluppatori devono però rigenerarlo dopo ogni modifica al sorgente.
11. **JSON renderer-neutral**: la pipeline scientifica non dipende dalla
    tecnologia di disegno.
12. **Migrazione automatica e idempotente**: nessun passaggio manuale per gli
    utenti delle versioni italiane.
13. **Repository pubblica senza dati**: codice MIT aperto, libreria personale e
    credenziali sempre locali.

## Limiti noti e possibili temi della beta

Questi sono punti aperti, non autorizzazioni automatiche a modificarli:

1. **[RISOLTO BETA] Superficie del server locale**: ora usa un'allowlist e non
   espone segreti, Git o LanceDB.
2. **[RISOLTO BETA] Metadati modificati**: titolo/abstract cambiati forzano un
   upsert con nuovo embedding; tag e collezioni non generano costi.
3. **[RISOLTO BETA] Elementi cancellati**: cestino, log `/deleted` e full read
   riconciliano cache, metadata e mappa locale.
4. **[RISOLTO BETA] Coerenza tra stato, cache e mappa**: JSON atomici con
   revisione comune, recupero cache↔mappa e stato pubblicato per ultimo.
5. **Qualità incrementale**: `sync` non ricalcola temi o layout globali; dopo
   molte aggiunte è necessario `refresh`.
6. **[RISOLTO BETA] Refresh del browser**: riconcilia l'intera fotografia senza
   perdere camera, ricerca o selezioni ancora valide.
7. **[RISOLTO BETA] Jitter incrementale**: è deterministico per chiave Zotero.
8. **Layout globale**: un `refresh` può spostare le isole quando cambia il
   dataset, anche con random seed fisso.
9. **Contenuto analizzato**: si usano solo titolo e abstract; paper senza
   abstract hanno rappresentazioni più deboli.
10. **[RISOLTO BETA] Link Zotero per librerie di gruppo**: entrambi i renderer
    usano tipo e ID pubblicati in `viewer.json` per costruire l'URI corretto.
11. **[RISOLTO BETA] Compatibilità embedding**: modello e dimensioni sono
    validati e le 1.536 dimensioni sono esplicite nella richiesta.
12. **[RISOLTO BETA] Tema `unclassified` incrementale**: la voce viene creata
    quando arriva la prima assegnazione `-1`.
13. **Prezzi OpenAI**: la tabella di costo è manuale e va verificata nel tempo.
14. **Test**: la copertura automatica include pipeline di cancellazione,
   pubblicazione JSON e sicurezza del server; mancano ancora contratti JSON
   completi, test browser end-to-end per entrambi i renderer, URI group e
   performance.
15. **Riproducibilità Python**: `requirements.txt` usa limiti minimi e non congela
   tutte le versioni transitive.
16. **Distribuzione**: l'installazione richiede ancora terminale, venv e `.env`;
    non esiste installer o interfaccia di onboarding per utenti non tecnici.
17. **Scalabilità**: il grafo effettua una ricerca vettoriale per paper e
    clustering/layout caricano tutto in RAM; è adeguato a circa 2.000 paper ma
    va misurato su librerie molto più grandi.
18. **Nomenclatura e traduzione residue**: il nome pubblico è “Semantic Zotero
    Knowledge Graph”, ma
    alcuni identificatori interni storici (`semantic-zotero-map`, titolo HTML o
    testi “Semantic map”) possono restare. Due commenti italiani sono ancora
    presenti nel fallback Cytoscape e la guida usa ancora il percorso locale
    storico `semantic2`. Non causano incompatibilità; valuta separatamente se
    uniformarli.

Per ogni punto, prima di implementare una soluzione spiega all'utente impatto,
costo, migrazione dei dati e possibilità di rollback.

## Regole per modifiche future

- Conserva la pipeline Python se il compito riguarda soltanto il rendering.
- Conserva entrambi i renderer finché l'utente non decide esplicitamente il
  contrario.
- Non cambiare dimensione o modello degli embedding senza progettare la
  compatibilità con LanceDB; i vettori esistenti hanno 1.536 dimensioni.
- Non cambiare l'identità basata sulla chiave Zotero senza una migrazione.
- Non rinominare campi JSON senza aggiornare pipeline, migratore, Sigma,
  Cytoscape, test e documentazione.
- Non editare direttamente `web/dist/app-sigma.bundle.js`: modifica
  `web/app-sigma.js` e ricostruisci il bundle.
- Non considerare le librerie vendorizzate sotto `web/vendor/` come codice
  applicativo da riformattare o tradurre.
- Mantieni la CI network-free; test Zotero/OpenAI restano manuali.
- Controlla sempre che `.env` e `data/` siano ignorati prima di un push.
- Se usi informazioni correnti su API, prezzi o dipendenze, verifica fonti
  ufficiali aggiornate.
- Dopo il lavoro lascia Git pulito, integra eventuali commit remoti senza force
  push e comunica commit/CI all'utente se hai pubblicato modifiche.

## Come iniziare la nuova sessione

Dopo aver completato le letture e i controlli iniziali, rispondi all'utente con:

1. una sintesi in linguaggio semplice di ciò che hai capito;
2. lo stato Git effettivo e le eventuali discrepanze rispetto a questo snapshot;
3. i rischi pertinenti al nuovo obiettivo;
4. un piano breve e verificabile.

Non iniziare da zero, non ripetere lavoro già concluso e non assumere che un
punto della possibile beta sia il prossimo obiettivo: attendi la richiesta
specifica dell'utente o usa quella fornita insieme a questo handover.
