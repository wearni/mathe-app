/* ============================================================
   Mathe App - Einstellungen für die Online-Bestenliste

   Solange hier nichts eingetragen ist, läuft die App komplett ohne
   Internet und die Bestenliste bleibt auf dem Gerät.

   Zum Einschalten die beiden Werte aus dem Supabase-Projekt eintragen
   (Project Settings -> API). Der "anon public" Schlüssel ist dafür
   gedacht, öffentlich in einer Webseite zu stehen.

   Die genaue Anleitung inklusive SQL steht im README unter
   "Online-Bestenliste einrichten".
   ============================================================ */
window.APP_CONFIG = {
  /* z. B. 'https://abcdefghijkl.supabase.co'  */
  supabaseUrl: '',

  /* der lange "anon public"-Schlüssel */
  supabaseKey: '',

  /* Name der Tabelle - muss zum SQL im README passen */
  table: 'highscores',

  /* Wie viele Einträge die Online-Liste zeigt */
  topCount: 20
};
