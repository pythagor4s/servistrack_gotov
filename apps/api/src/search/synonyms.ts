import { fold } from "./text";
import { stem } from "./stem";

const GROUPS: string[][] = [
  ["tiskalnik", "printer", "štampač", "stampac", "pisač"],
  ["šoba", "šobe", "dize", "dizna", "mlaznica", "nozzle"],
  ["črnilo", "tinta", "mastilo", "ink"],
  ["glava", "glave", "printhead"],
  ["proge", "progast", "pasovi", "črte", "linije", "banding"],
  ["barva", "odtenek", "boja", "nijansa"],
  ["profil", "icc", "profila"],
  ["madež", "madeži", "packa", "fleka", "mrlja", "umazanija"],
  ["kapljanje", "kaplja", "kapa"],
  ["podtlak", "vakuum", "vakum", "vacuum", "sesanje", "vakuumski", "vakuumska"],
  ["tlak", "pritisk", "pritisak"],
  ["kompresor", "kompresorja"],
  ["puščanje", "pušča", "puščal", "uhaja", "curi", "curenje", "cureti", "propušta"],
  ["zamakanje", "zamaka", "prokišnjava"],
  ["nož", "rezilo", "rezila", "nožek", "sečivo", "oštrica", "knife", "blade"],
  ["rezanje", "rez", "razrez", "sečenje", "rezati", "reže"],
  ["razcefran", "cefra", "strgan", "neraven", "raščupan"],
  ["rezkar", "rezkanje", "cnc", "glodalica"],
  ["vreteno", "spindle"],
  ["ležaj", "ležaji", "kuglični", "bearing"],
  ["valj", "valji", "valjček", "valjak", "roller"],
  ["podajanje", "pomik", "feed", "uvlačenje"],
  ["zatika", "zatikanje", "zatakne", "zagozdi", "zagozditev", "zastoj", "zaglavi", "zaglavljen", "zaglavljuje", "jam"],
  ["mehurčki", "mehurček", "mehurčkov", "mjehurići", "balončki"],
  ["filter", "filtra", "filtri"],
  ["miza", "mize", "stol", "sto", "table"],
  ["pregret", "pregretje", "pregreva", "pregrevanje", "pregrija", "pregrijava", "pregrijavanje", "overheat"],
  ["temperatura", "toplota", "vročina", "temperature"],
  ["sušilnik", "sušenje", "sušač", "sušilo"],
  ["grelec", "grelnik", "grijač", "grelni"],
  ["hlajenje", "hladi", "hladilni", "hlađenje", "klima"],
  ["var", "varjenje", "zvar", "spoj", "varenje"],
  ["senzor", "tipalo", "sensor", "zaznavalo"],
  ["kabel", "kabl", "žica", "vodnik"],
  ["napajalnik", "napajanje", "napajanja", "psu"],
  ["luč", "lučka", "lučke", "svetilka", "sijalka", "žarnica", "lampa", "sijalica", "razsvetljava"],
  ["stikalo", "prekidač", "prekidac", "switch"],
  ["napaka", "greška", "error", "alarm", "opozorilo", "koda"],
  ["ustavi", "ustavlja", "zaustavi", "zaustavitev", "izklopi", "izklaplja", "ugasne", "gasi", "staje", "zaustavlja"],
  ["pika", "pike", "pikice", "pikica", "točke", "tačke", "točkice"],
  ["razlika", "odstopanje", "odstopa", "različen", "drugačen", "drugačna", "enake", "enaka"],
  ["odpove", "odpoved", "odpoveduje", "crkne", "pokvarjen", "pokvaren", "okvara", "kvar"],
  ["zamašen", "zamašitev", "zamašek", "zamaši", "začepljen", "zacepljen", "blokiran"],
  ["čiščenje", "čistiti", "očistiti", "očiščen", "brisanje", "čišćenje", "čistilo"],
  ["počasen", "počasi", "sporo", "spor", "zakasnitev"],
  ["neenakomeren", "neenakomerno", "nejednak", "neravnomjerno"],
  ["omrežje", "mreža", "network", "internet", "povezava", "lan", "wifi"],
  ["računalnik", "računar", "postaja", "pc", "kompjuter"],
  ["disk", "pogon", "ssd", "hdd"],
  ["rip", "caldera", "spooler"],
  ["licenca", "aktivacija", "ključ"],
  ["geslo", "lozinka", "šifra", "password"],
  ["pošta", "email", "mail", "e-pošta"],
  ["varnostna", "backup", "kopija", "rezervna"],
  ["streha", "strop", "krov"],
];

const RELATED = new Map<string, Set<string>>();
for (const group of GROUPS) {
  const stems = [...new Set(group.map((w) => stemOf(w)))];
  for (const s of stems) {
    let set = RELATED.get(s);
    if (!set) RELATED.set(s, (set = new Set()));
    for (const other of stems) if (other !== s) set.add(other);
  }
}

function stemOf(word: string): string {
  const folded = fold(word).replace(/[-_./]/g, "");
  return /\d/.test(folded) ? folded : stem(folded);
}

export function synonymsOf(stemmed: string): readonly string[] {
  const set = RELATED.get(stemmed);
  return set ? [...set] : [];
}
