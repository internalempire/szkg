# Come funziona la Mappa Semantica della tua libreria

Questo documento racconta, in linguaggio discorsivo e senza gergo inutile, che
cosa fa questa applicazione e come si usa. È pensato per te che la userai — non
per chi tocca il codice. Se un giorno vorrai capire *anche* il codice, ogni file
è commentato con lo stesso spirito; ma per usare l'app basta questo testo.

---

## In una frase

L'app prende i paper della tua libreria **Zotero**, capisce di cosa parlano, e li
dispone su una **mappa interattiva** dove i lavori che trattano argomenti simili
finiscono vicini e si raggruppano in **temi** con un'etichetta automatica. Quando
aggiungi nuovi paper in Zotero, un comando li fa comparire sulla mappa vicino ai
loro simili, **senza rifare tutto da capo**.

---

## La storia di un paper, dall'inizio alla fine

Immagina di aver appena salvato un nuovo articolo in Zotero. Ecco cosa gli succede
quando lanci l'aggiornamento della mappa.

1. **Zotero.** L'app si collega alla tua libreria Zotero (tramite il servizio
   ufficiale, quello che sincronizza i tuoi dati) e chiede: *"cosa è cambiato
   dall'ultima volta?"*. Zotero risponde con i soli paper nuovi. Di ciascuno
   prendiamo **titolo e abstract**: è il testo da cui capiremo l'argomento.

2. **L'embedding (le "coordinate del significato").** Il testo del paper viene
   inviato a un servizio esterno (OpenAI) che restituisce una lunga lista di
   numeri — 1536, per la precisione. Sono come le *coordinate del paper in uno
   spazio delle idee*: due paper che parlano di cose simili ricevono coordinate
   vicine; due che parlano di cose diverse, coordinate lontane. Questo è l'unico
   passo che costa qualcosa, ma cifre irrisorie (vedi più sotto).

3. **Il magazzino.** Le coordinate, insieme a titolo e abstract, vengono
   archiviate in un piccolo database sul tuo computer (nella cartella `data/`).
   Da quel momento il paper è "conosciuto": non lo pagheremo mai più, perché prima
   di chiedere le coordinate a OpenAI controlliamo sempre se le abbiamo già.

4. **I legami (il grafo).** Per collocare il paper nella rete, cerchiamo i suoi
   *vicini più simili* già presenti e tracciamo una linea verso di loro, ma solo
   se la somiglianza è abbastanza alta. Così il paper si aggancia alla zona giusta
   della mappa.

5. **Il tema.** Guardiamo a quale tema appartengono i suoi vicini e gli diamo lo
   stesso: *"entri nel gruppo dei paper a cui somigli di più"*. È un'assegnazione
   "morbida" (la chiamiamo *debole*), e sulla mappa i paper agganciati così si
   vedono un po' più tenui.

6. **La mappa.** Il paper compare sulla mappa, colorato come il suo tema, vicino
   ai suoi simili. Le posizioni di tutti gli altri paper restano dov'erano: la
   mappa che conoscevi non si stravolge.

Tutto qui. Il bello è che i passi 4-5-6 avvengono **senza ricalcolare l'intero
spazio**: si appoggiano a ciò che è già stato fatto.

---

## I pezzi dell'app, spiegati uno per uno

- **Zotero come sorgente.** Non leggiamo PDF sparsi sul disco: la fonte è la tua
  libreria Zotero, che è già ordinata e con i metadati (titolo, abstract, autori).
  Usiamo il servizio ufficiale di Zotero perché è stabile e sa dirci con
  precisione "cosa è cambiato", il che rende gli aggiornamenti veloci.

- **L'embedding esterno.** Invece di far girare un modello di intelligenza
  artificiale sul tuo laptop (pesante e lento), affittiamo per un istante quello
  di OpenAI. Il modulo che lo gestisce è costruito in modo che, se un domani
  volessi cambiare fornitore (per esempio Voyage o Cohere), si sostituisca un
  pezzo solo senza toccare il resto.

- **Il magazzino (LanceDB).** Un database che vive in una cartella sul tuo disco,
  senza server né cloud. Tiene insieme, per ogni paper, il testo e le sue
  coordinate. È fatto apposta per l'**aggiunta incrementale**: aggiungere un paper
  è come aggiungere una riga a un foglio di calcolo, non serve ricostruire nulla.

- **Il grafo di somiglianza.** La rete di linee tra i paper. Non colleghiamo tutti
  con tutti (sarebbe una ragnatela illeggibile): per ogni paper teniamo solo i
  pochi vicini più simili, e solo sopra una certa soglia di somiglianza.

- **I temi (il clustering).** L'app raggruppa da sola i paper in "isole"
  tematiche e dà a ciascuna un nome, scegliendo le parole che compaiono tanto in
  quel gruppo e poco negli altri (per esempio *"ventilazione, pressione, PEEP"*).
  Non tutti i paper formano un'isola densa: quelli di frontiera vengono
  agganciati al tema più vicino.

- **La mappa (nel browser).** La disposizione è calcolata in modo che i paper
  simili stiano vicini, formando isole colorate. Il browser la disegna con la
  GPU tramite WebGL: anche migliaia di legami possono restare visibili mentre
  ti muovi. Puoi esplorarla con zoom, ricerca, clic e temi accesi/spenti.

- **Il renderer di sicurezza.** La versione normale usa Sigma.js e la GPU. La
  precedente versione Cytoscape resta inclusa: se WebGL crea problemi, aggiungi
  `?renderer=cytoscape` alla fine dell'indirizzo della mappa. Legge esattamente
  gli stessi dati e non richiede una seconda pipeline.

---

## I tre comandi che userai

Tutto si comanda da un unico punto, `app.py`, con tre "verbi". I comandi si danno
dal terminale, **dentro la cartella del progetto**, con l'ambiente attivo (vedi
"Prima configurazione" in fondo se parti da zero).

### `python app.py sync` — l'aggiornamento di tutti i giorni

È l'operazione veloce. Chiede a Zotero **solo le novità**, calcola le coordinate
**solo dei paper nuovi** (spesa: una frazione di centesimo) e li aggiunge alla
mappa vicino ai loro simili. Le posizioni degli altri paper non si toccano.

*Cosa aspettarti:* qualche riga che dice quanti paper nuovi ha trovato, la spesa
(minima), e "Aggiunti N paper alla mappa". Se non ci sono novità, te lo dice e
non spende nulla.

### `python app.py refresh` — la grande pulizia periodica

Ogni tanto (per esempio dopo aver aggiunto molti paper) conviene rifare i conti
per bene. `refresh` rilegge **tutto** l'archivio e ricostruisce da zero grafo,
temi, etichette e disposizione. Riusa le coordinate già calcolate, quindi **non
richiama l'API a pagamento** per i paper vecchi: la spesa resta zero (salvo
eventuali paper mai embeddati prima).

*Perché serve, se c'è già `sync`?* Perché `sync` è "morbido": aggancia i nuovi
paper ai vicini, ma non ripensa l'intera organizzazione dei temi. Con `refresh` i
temi vengono ricalcolati per bene e la disposizione viene ridisegnata in modo
ottimale. In cambio, la mappa cambia aspetto (le isole si riposizionano).

*Cosa aspettarti:* impiega qualche decina di secondi (calcola temi e disposizione
di tutta la libreria) e alla fine salva la mappa aggiornata.

### `python app.py serve` — apri la mappa

Avvia un piccolo server locale (solo sul tuo computer, non raggiungibile da
internet) e apre la mappa nel browser. Per fermarlo, premi `Ctrl+C` nel terminale.

---

## Il ciclo d'uso tipico

1. Durante la settimana aggiungi qualche paper in **Zotero**, come fai di solito.
   Assicurati che Zotero abbia sincronizzato (l'icona di sync non gira più).
2. Ogni tanto lanci **`python app.py sync`**: i paper nuovi entrano nella mappa.
3. Apri la mappa con **`python app.py serve`** (se è già aperta, basta il pulsante
   **"Refresh data"** nella barra laterale: inserisce i nuovi senza ridisegnare).
4. Una volta ogni tanto (ad esempio una volta al mese, o dopo un'aggiunta grossa)
   lanci **`python app.py refresh`** per rimettere ordine nei temi.

---

## Muoversi nella mappa

- **Zoom**: i pulsanti `+` / `−` in basso a sinistra, oppure la rotellina del
  mouse. Man mano che ingrandisci, i pallini si distanziano invece di
  sovrapporsi, così puoi distinguerli. Il pulsante `⤢` reinquadra tutto.
- **Passa il mouse** su un pallino per vederne il titolo.
- **Clicca un pallino**: si evidenzia con un anello luminoso, e compare un
  riquadro con titolo, tema e un link **"Apri in Zotero"** che apre la voce
  direttamente nel tuo Zotero.
- **Clicca una linea ambra** dopo aver scelto un pallino: la linea diventa
  bianca e compare un secondo riquadro con l'articolo collegato.
- **Clicca un tema** nella legenda a sinistra: accende solo quel tema e sfuma gli
  altri. Riclicca per tornare alla vista piena.
- **Casella accanto a ogni tema**: toglila per **nascondere** quell'isola dalla
  mappa; rimettila per farla ricomparire.
- **Cerca** nella casella in alto: evidenzia i paper il cui titolo contiene il
  testo digitato.
- **"Show weak assignments"**: nasconde/mostra i paper agganciati in modo
  morbido (i pallini più tenui).

---

## Quanto costa

Pochissimo. L'unico costo è l'embedding, con il modello `text-embedding-3-small`
di OpenAI. Come riferimento reale: l'intera libreria iniziale (quasi 1.900 paper)
è costata **meno di un centesimo** in totale. Ogni paper nuovo aggiunto in seguito
costa una frazione di millesimo di centesimo. Ad ogni operazione l'app ti mostra
comunque quanti "token" ha inviato e la spesa stimata, così hai sempre il conto
sotto gli occhi. Bastano pochi dollari di credito su OpenAI per anni d'uso.

---

## Manutenzione e qualità dei dati

- **`python data_quality.py`** ti elenca le voci di Zotero con dati poveri: quelle
  che hanno come titolo un nome di file (es. `Larson.pdf`) o senza abstract. Per
  quei paper le coordinate sono poco affidabili e finiscono in temi "finti".
  Non è obbligatorio sistemarle, ma se aggiungi titolo e abstract veri in Zotero e
  poi lanci un `refresh`, la mappa migliora.

- **Quando fare `refresh`**: quando hai aggiunto parecchi paper con `sync` e noti
  che i nuovi si accumulano un po' alla rinfusa, oppure dopo aver sistemato voci
  con `data_quality.py`. Non c'è una regola fissa: `sync` va benissimo per l'uso
  quotidiano, `refresh` è la messa a punto.

---

## Le cartelle e i file (cosa non toccare)

- `data/` — il cuore dei tuoi dati: il database delle coordinate (`lancedb/`), la
  mappa (`graph.json`), i temi (`clusters.json`) e il diario (`state.json`, che
  ricorda l'ultima versione Zotero vista). **Non serve aprirli né modificarli a
  mano.** Si rigenerano con i comandi.
- `.env` — le tue chiavi segrete (Zotero e OpenAI). **Non condividerlo con
  nessuno.**
- `web/` — la pagina della mappa e le librerie di visualizzazione.
- I file `.py` — il programma vero e proprio, tutti commentati.

---

## Se qualcosa non va

- **"Configurazione incompleta nel file .env"**: manca una chiave. Apri `.env` e
  controlla che `ZOTERO_LIBRARY_ID`, `ZOTERO_API_KEY` e `OPENAI_API_KEY` siano
  compilati.
- **`sync` non trova i paper nuovi**: assicurati che Zotero abbia **sincronizzato**
  (i dati devono essere saliti sul cloud di Zotero perché l'API li veda).
- **La mappa appare come una griglia regolare** invece che a isole: è il browser
  che mostra una versione vecchia. Fai un ricaricamento forzato (`Cmd+Shift+R`).
- **La mappa non si apre**: verifica di aver eseguito almeno un `refresh` (o un
  `sync`) che abbia creato i file in `data/`, e che il server (`app.py serve`) sia
  in esecuzione.

---

## Prima configurazione (se parti da un computer nuovo)

Da fare una volta sola:

1. **Ambiente Python** (isola le librerie dell'app dal resto del sistema):
   ```bash
   cd /percorso/della/cartella/semantic2
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Chiavi** nel file `.env` (copia il modello e compila i valori):
   ```bash
   cp .env.example .env
   ```
   Poi apri `.env` e inserisci: l'ID e la chiave API di Zotero
   (da <https://www.zotero.org/settings/keys>) e la chiave OpenAI
   (da <https://platform.openai.com/api-keys>, con un piccolo credito attivo).
3. **Prima costruzione** della mappa (embedda tutta la libreria, pochi centesimi):
   ```bash
   python app.py refresh
   ```
4. **Apri la mappa**:
   ```bash
   python app.py serve
   ```

Da lì in poi, la vita di tutti i giorni è solo: aggiungi paper in Zotero →
`python app.py sync` → guarda la mappa.

---

## Cosa succede al primo avvio dopo l'aggiornamento

Le prime versioni dell'app salvavano alcuni nomi tecnici in italiano dentro
`graph.json`, `clusters.json` e `state.json`. La versione pubblicabile usa nomi
inglesi. Non devi convertire nulla a mano: quando esegui `serve`, `sync` o
`refresh`, `data_migration.py` riconosce il vecchio formato e rinomina soltanto
quei campi.

La conversione non apre il database degli embedding, non cambia titoli o
abstract, non contatta Zotero o OpenAI e quindi non costa nulla. Prima scrive un
file temporaneo completo e solo dopo sostituisce quello vecchio: così un errore
a metà non lascia un JSON incompleto. Inoltre è *idempotente*, cioè dopo la
prima conversione i successivi avvii controllano i file ma non li riscrivono.

Il piccolo compromesso è che nel codice del migratore rimangono i vecchi nomi
italiani: non sono parti dell'interfaccia corrente, ma una compatibilità
intenzionale che permette alle mappe esistenti di continuare a funzionare.
