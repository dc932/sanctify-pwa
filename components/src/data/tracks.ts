import type { Track } from '@/types/audio';

const AUDIO = {
  mozartSonata: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Mozart%2C_Wolfgang_Amadeus_%E2%80%94_Piano_Sonata_No._10_in_C_major%2C_K._330%2C_3rd_movement_%E2%80%94_Vadim_Chaimovich_%E2%80%94_Musopen_-8825.mp3',
  chopinWaltz: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Chopin_-_Waltz_in_E_minor%2C_B_56.mp3',
  fischerPrelude: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Ariadne_Musica_-_J._C._F._Fischer%2C_Prelude_and_Fugue_n._1%2C_Arranged_for_Piano.mp3',
  albumGavotte: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Album_Leaves_Gavotte_Op._11_No._1.mp3',
  joplinEntertainer: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Scott_Joplin_-_04_-_The_Entertainer_1902_piano_roll.mp3',
  joplinLeola: 'https://upload.wikimedia.org/wikipedia/commons/6/60/%22Leola_%28Two-Step%29%22_%281905%29%2C_by_Scott_Joplin.mp3',
  celloSonataI: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Sonata_for_Piano_and_Cello_in_G_Minor%2C_Op._65_-_I._Allegro_Moderato.mp3',
  celloSonataII: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Sonata_for_Piano_and_Cello_in_G_Minor%2C_Op._65_-_II._Scherzo.mp3',
  celloSonataIII: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Sonata_for_Piano_and_Cello_in_G_Minor%2C_Op._65_-_III._Largo.mp3',
  celloSonataIV: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Sonata_for_Piano_and_Cello_in_G_Minor%2C_Op._65_-_IV._Finale._Allegro.mp3',
  fluteVariations: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Variations_for_flute_and_piano.mp3',
};

const AUDIO_POOL = Object.values(AUDIO);

const audioAt = (index: number) => AUDIO_POOL[index % AUDIO_POOL.length];

export const sampleMusicTracks: Track[] = [
  {
    id: 'm1',
    title: 'La Mesa Compartida',
    artist: 'Sanctify Music',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    audioUrl: audioAt(0),
    category: 'music',
    duration: 210,
    lyrics: `Hay una mesa larga, dispuesta sin prisa,
con sillas para todos, también para el que llega tarde.
Nadie se sienta solo cuando el pan se parte,
y en cada copa cabe un nombre distinto.`,
  },
  {
    id: 'm2',
    title: 'Gracia e Inmensidad',
    artist: 'Coro Melodía',
    artworkUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
    audioUrl: audioAt(1),
    category: 'music',
    duration: 185,
    lyrics: `Mirar el cielo abierto y sentirse pequeño,
y aun así sentirse amado sin medida.
La gracia no se compra, se recibe con las manos abiertas,
y su inmensidad cabe en un solo suspiro.`,
  },
  {
    id: 'm3',
    title: 'Luz en la Penumbra',
    artist: 'Ensamble Acústico',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
    audioUrl: audioAt(2),
    category: 'music',
    duration: 240,
    lyrics: `Cuando la noche cae y no encuentro el camino,
basta una chispa pequeña para ver el siguiente paso.
No necesito el mapa completo, solo la luz de hoy,
y con eso avanzo, despacio pero firme.`,
  },
  {
    id: 'm4',
    title: 'Paz Profunda',
    artist: 'Armonía Espiritual',
    artworkUrl: 'https://images.unsplash.com/photo-1445307806294-bff7f67ff225?w=600',
    audioUrl: audioAt(3),
    category: 'music',
    duration: 195,
    lyrics: `Hay un lugar dentro de mí donde el ruido no llega,
una sala tranquila donde el alma respira.
Vuelvo a ese lugar cada vez que el mundo pesa,
y descanso en una paz que no depende de nada.`,
  },
  {
    id: 'm5',
    title: 'Camino de Esperanza',
    artist: 'Ministerio de Alabanza',
    artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
    audioUrl: audioAt(4),
    category: 'music',
    duration: 220,
    lyrics: `Hay un camino largo que se abre paso entre piedras,
y aun así cada curva promete un horizonte nuevo.
La esperanza no grita, camina a mi lado,
y me recuerda que el final no es el final.`,
  },
  {
    id: 'm6',
    title: 'Refugio Seguro',
    artist: 'Sanctify Worship',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
    audioUrl: audioAt(5),
    category: 'music',
    duration: 205,
    lyrics: `Cuando la tormenta golpea la puerta,
hay un techo firme donde puedo quedarme.
No es un muro de miedo, es un abrazo de calma,
un lugar al que siempre se puede volver.`,
  },
  {
    id: 'm7',
    title: 'Canto de Amanecer',
    artist: 'Orquesta Clásica',
    artworkUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600',
    audioUrl: audioAt(6),
    category: 'music',
    duration: 180,
    lyrics: `Antes de que el sol toque la ventana,
la casa ya despierta con un canto suave.
Cada nota es una gracia nueva,
y el día empieza como una promesa.`,
  },
  {
    id: 'm8',
    title: 'Pan de Vida',
    artist: 'Voces de Paz',
    artworkUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600',
    audioUrl: audioAt(7),
    category: 'music',
    duration: 230,
    lyrics: `Hay un pan sencillo que sostiene más que el hambre,
un alimento que se reparte sin agotarse.
Quien lo recibe se levanta distinto,
y quien lo comparte descubre que nunca se queda vacío.`,
  },
  {
    id: 'm9',
    title: 'Fuente Inagotable',
    artist: 'Coro Jubiloso',
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
    audioUrl: audioAt(8),
    category: 'music',
    duration: 190,
    lyrics: `Un agua clara brota desde lo profundo,
no se acaba aunque muchos beban de ella.
Cuando la sed vuelve, la fuente sigue ahí,
fresca como el primer día.`,
  },
  {
    id: 'm10',
    title: 'Bajo tus Alas',
    artist: 'Acoustic Grace',
    artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
    audioUrl: audioAt(9),
    category: 'music',
    duration: 215,
    lyrics: `Bajo tus alas hay un silencio que cuida,
un calor que no pide explicaciones.
Puedo cerrar los ojos y dejar que el miedo pase,
porque aquí ya no tengo que cargar solo.`,
  },
  {
    id: 'm11',
    title: 'Eterno Amor',
    artist: 'Banda Gloria',
    artworkUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600',
    audioUrl: audioAt(10),
    category: 'music',
    duration: 200,
    lyrics: `Hay un amor que no se gasta con los años,
que aguanta las estaciones sin cambiar de rostro.
Cuando las hojas caen, sigue echando raíces,
y cuando florece, lo hace sin pedir nada a cambio.`,
  },
  {
    id: 'm12',
    title: 'Río de Bendición',
    artist: 'Sanctify Ensemble',
    artworkUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600',
    audioUrl: audioAt(11),
    category: 'music',
    duration: 250,
    lyrics: `Un río que atraviesa campos secos,
dejando a su paso verde y canto.
La bendición fluye cuando se entrega,
y se multiplica en cada orilla que toca.`,
  },
  {
    id: 'm13',
    title: 'Morada de Paz',
    artist: 'Sinfónica Instrumental',
    artworkUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600',
    audioUrl: audioAt(12),
    category: 'music',
    duration: 175,
    lyrics: `Hay una casa interior con puertas abiertas,
donde cada habitación guarda un recuerdo sereno.
Entro sin llave, me siento sin prisa,
y la paz me recibe como una vieja amiga.`,
  },
  {
    id: 'm14',
    title: 'Alianza de Amor',
    artist: 'Coro Sacro',
    artworkUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600',
    audioUrl: audioAt(13),
    category: 'music',
    duration: 210,
    lyrics: `Un pacto hecho de fidelidad y ternura,
que se renueva cada mañana con un gesto simple.
No se rompe cuando fallamos,
se repara con perdón y se fortalece con el tiempo.`,
  },
  {
    id: 'm15',
    title: 'Sombra del Altísimo',
    artist: 'Dúo Armonía',
    artworkUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
    audioUrl: audioAt(14),
    category: 'music',
    duration: 225,
    lyrics: `Bajo el sol más intenso hay una sombra que refresca,
un espacio donde el cuerpo descansa y el alma respira.
No elimina el calor, pero lo vuelve soportable,
y recuerda que no estamos expuestos a la intemperie.`,
  },
  {
    id: 'm16',
    title: 'Soplo de Vida',
    artist: 'Viento Suave',
    artworkUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600',
    audioUrl: audioAt(15),
    category: 'music',
    duration: 195,
    lyrics: `Un viento leve mueve las hojas del jardín,
y en ese movimiento se siente la vida.
Así llega el aliento cuando el cuerpo se cansa,
renovando lo que parecía apagado.`,
  },
  {
    id: 'm17',
    title: 'Fuego Santo',
    artist: 'Pueblo Unido',
    artworkUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
    audioUrl: audioAt(16),
    category: 'music',
    duration: 205,
    lyrics: `Un fuego que calienta sin consumir,
que enciende la voz de quienes estaban callados.
Se extiende de mano en mano,
y donde pasa, la comunidad vuelve a cantar.`,
  },
  {
    id: 'm18',
    title: 'Silencio Santo',
    artist: 'Meditación Sonora',
    artworkUrl: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=600',
    audioUrl: audioAt(17),
    category: 'music',
    duration: 240,
    lyrics: `Antes de cualquier palabra existe un silencio,
un espacio donde la voz de Dios se escucha mejor.
No es vacío, es presencia que espera,
y allí aprendo a escuchar lo que de verdad importa.`,
  },
  {
    id: 'm19',
    title: 'Castillo Fuerte',
    artist: 'Banda Devoción',
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    audioUrl: audioAt(18),
    category: 'music',
    duration: 215,
    lyrics: `Hay murallas que nadie ve, hechas de confianza,
y torres que se levantan piedra a piedra en la oración.
Cuando los vientos golpean, la fortaleza resiste,
porque su cimiento no está en mí, sino en quien la sostiene.`,
  },
  {
    id: 'm20',
    title: 'Eterno Resplandor',
    artist: 'Coro San Pedro',
    artworkUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
    audioUrl: audioAt(19),
    category: 'music',
    duration: 230,
    lyrics: `Una luz que no se apaga con la noche,
que brilla en los rincones más olvidados.
Cuando todo parece oscuro, ella permanece,
y su resplandor alcanza a quien la busca.`,
  },
];

export const samplePodcastTracks: Track[] = [
  {
    id: 's1',
    title: 'Salmo 23: El Señor es mi Pastor',
    artist: 'Lectura Orada',
    artworkUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600',
    audioUrl: audioAt(0),
    category: 'podcast',
    duration: 120,
    lyrics: `Nada me falta cuando confío en quien me guía.
Me lleva a pastos tranquilos y me invita a descansar junto al agua.
Aunque atraviese valles oscuros, no temo el mal,
porque su vara y su cayado me dan seguridad.`,
  },
  {
    id: 's2',
    title: 'Salmo 91: El Refugio del Altísimo',
    artist: 'Voz Litúrgica',
    artworkUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=600',
    audioUrl: audioAt(1),
    category: 'podcast',
    duration: 150,
    lyrics: `Quien habita al abrigo de lo alto descansa a la sombra de su protección.
Puedo decir con calma: aquí encuentro refugio.
Las noches de temor pasan, y el día trae una fuerza nueva,
porque el que me cuida no duerme.`,
  },
  {
    id: 's3',
    title: 'Salmo 121: El Guardián de Israel',
    artist: 'Padre Juan',
    artworkUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600',
    audioUrl: audioAt(2),
    category: 'podcast',
    duration: 110,
    lyrics: `Levanto los ojos hacia las montañas y pienso de dónde viene mi ayuda.
Viene del que hizo el cielo y la tierra.
No duerme ni se cansa mientras yo camino,
y cuida mis pasos de ahora en adelante.`,
  },
  {
    id: 's4',
    title: 'Salmo 27: El Señor es mi Luz',
    artist: 'Hermanos Contemplativos',
    artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600',
    audioUrl: audioAt(3),
    category: 'podcast',
    duration: 140,
    lyrics: `Si el Señor es mi luz, ¿a quién temeré?
Pido una sola cosa: habitar en su presencia todos los días.
Aunque se levanten tormentas, mi corazón permanece firme,
porque espero con paciencia el buen tiempo.`,
  },
  {
    id: 's5',
    title: 'Salmo 51: Piedad de mí, Oh Dios',
    artist: 'Meditación Vocacional',
    artworkUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600',
    audioUrl: audioAt(4),
    category: 'podcast',
    duration: 160,
    lyrics: `Reconozco mis errores sin esconderlos.
Pido un corazón limpio y un espíritu que vuelva a estar firme.
No me apartes de tu presencia,
y devuélveme la alegría de empezar de nuevo.`,
  },
  {
    id: 's6',
    title: 'Salmo 46: Dios es nuestro Amparo',
    artist: 'Lectura Orada',
    artworkUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600',
    audioUrl: audioAt(5),
    category: 'podcast',
    duration: 130,
    lyrics: `Aunque la tierra tiemble y los montes se muevan,
hay un río cuyas corrientes alegran la ciudad.
Quédate quieto y reconoce que Dios está en medio,
porque él es nuestro amparo y nuestra fortaleza.`,
  },
  {
    id: 's7',
    title: 'Salmo 100: Aclamad al Señor',
    artist: 'Comunidad Orante',
    artworkUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600',
    audioUrl: audioAt(6),
    category: 'podcast',
    duration: 105,
    lyrics: `Canten con alegría y entren con gratitud.
Reconozcan que el Señor es bueno y que su amor permanece.
Somos su pueblo, las ovejas de su prado,
y por eso hoy elevamos un canto sincero.`,
  },
  {
    id: 's8',
    title: 'Salmo 139: Tú me Escudriñas y Conoces',
    artist: 'Reflexión Guiada',
    artworkUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
    audioUrl: audioAt(7),
    category: 'podcast',
    duration: 175,
    lyrics: `Me conoces por dentro y por fuera, sin que tenga que explicarme.
Ningún lugar queda fuera de tu mirada, ni la noche más profunda.
Me formaste con cuidado y me das un sentido,
y en tu presencia encuentro mi lugar.`,
  },
  {
    id: 's9',
    title: 'Salmo 1: Bienaventurado el Varón',
    artist: 'Voz Litúrgica',
    artworkUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600',
    audioUrl: audioAt(8),
    category: 'podcast',
    duration: 115,
    lyrics: `Dichoso quien se aparta del mal consejo.
Es como un árbol junto al agua, que da fruto a su tiempo.
Sus hojas no se marchitan aunque llegue el calor,
porque sus raíces buscan la corriente.`,
  },
  {
    id: 's10',
    title: 'Salmo 150: Alabad al Señor en su Santuario',
    artist: 'Padre Juan',
    artworkUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600',
    audioUrl: audioAt(9),
    category: 'podcast',
    duration: 95,
    lyrics: `Alaben al Señor con trompeta y con arpa.
Que todo lo que respira lo alabe con gozo.
Con danza, con cuerdas y con voces fuertes,
la casa entera responde con un solo canto.`,
  },
  {
    id: 's11',
    title: 'Salmo 34: Bendeciré al Señor en todo Tiempo',
    artist: 'Lectura Orada',
    artworkUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600',
    audioUrl: audioAt(10),
    category: 'podcast',
    duration: 140,
    lyrics: `Bendeciré al Señor en todo tiempo, aun en los días difíciles.
Busqué su ayuda y me respondió, y me libró de mis temores.
Miren hacia él y su rostro se iluminará,
porque cerca de los que tienen el corazón roto está el Señor.`,
  },
  {
    id: 's12',
    title: 'Salmo 42: Como Busca el Ciervo las Corrientes',
    artist: 'Hermanos Contemplativos',
    artworkUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600',
    audioUrl: audioAt(11),
    category: 'podcast',
    duration: 135,
    lyrics: `Como busca el ciervo las corrientes de agua, así mi alma te busca.
Tengo sed de Dios, del Dios vivo.
Aunque las lágrimas sean mi alimento de día y de noche,
espero en él, que sigue siendo mi salvación.`,
  },
  {
    id: 's13',
    title: 'Salmo 63: Dios Mío, Tú eres mi Dios',
    artist: 'Meditación Vocacional',
    artworkUrl: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600',
    audioUrl: audioAt(12),
    category: 'podcast',
    duration: 125,
    lyrics: `Dios mío, eres mi Dios y te busco desde la aurora.
Mi alma tiene sed, mi cuerpo anhela una tierra seca sin agua.
Tu amor vale más que la vida,
y en tu cercanía encuentro reposo.`,
  },
  {
    id: 's14',
    title: 'Salmo 84: ¡Qué Amables son tus Moradas!',
    artist: 'Comunidad Orante',
    artworkUrl: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600',
    audioUrl: audioAt(13),
    category: 'podcast',
    duration: 150,
    lyrics: `¡Qué amables son tus moradas, Señor de los ejércitos!
Hasta el gorrión encuentra casa y la golondrina nido.
Dichosos los que habitan tu casa,
porque un día en tus atrios vale más que mil en otro lugar.`,
  },
  {
    id: 's15',
    title: 'Salmo 103: Bendice, Alma Mía, al Señor',
    artist: 'Reflexión Guiada',
    artworkUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=600',
    audioUrl: audioAt(14),
    category: 'podcast',
    duration: 165,
    lyrics: `Bendice, alma mía, todo lo que hay en mí.
Él perdona tus faltas y sana tus dolencias.
Su misericordia es tan grande como el cielo sobre la tierra,
y no nos trata según nuestras culpas.`,
  },
  {
    id: 's16',
    title: 'Salmo 118: Dad Gracias al Señor porque es Bueno',
    artist: 'Voz Litúrgica',
    artworkUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
    audioUrl: audioAt(15),
    category: 'podcast',
    duration: 180,
    lyrics: `Den gracias al Señor, porque es bueno y su amor es eterno.
Cuando todo parecía cerrado, una puerta se abrió.
La piedra que los constructores rechazaron
se volvió la piedra angular del día de hoy.`,
  },
  {
    id: 's17',
    title: 'Salmo 130: Desde lo Hondo a Ti Grito',
    artist: 'Padre Juan',
    artworkUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600',
    audioUrl: audioAt(16),
    category: 'podcast',
    duration: 110,
    lyrics: `Desde lo hondo te llamo, Señor, escucha mi voz.
Si llevaras cuenta de nuestras faltas, nadie podría estar en pie.
Pero hay perdón contigo, y por eso esperó,
como el centinela que aguarda la aurora.`,
  },
  {
    id: 's18',
    title: 'Salmo 145: Te Exaltaré, mi Dios, mi Rey',
    artist: 'Lectura Orada',
    artworkUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600',
    audioUrl: audioAt(17),
    category: 'podcast',
    duration: 145,
    lyrics: `Te exaltaré, mi Dios y Rey, y bendeciré tu nombre para siempre.
Cada día te bendeciré, y alabaré tu nombre sin fin.
El Señor es paciente y misericordioso,
lento para la ira y grande en amor.`,
  },
  {
    id: 's19',
    title: 'Salmo 8: ¡Qué Admirable es tu Nombre!',
    artist: 'Hermanos Contemplativos',
    artworkUrl: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600',
    audioUrl: audioAt(18),
    category: 'podcast',
    duration: 100,
    lyrics: `Cuando miro el cielo, obra de tus manos, me pregunto quién soy.
Y aun así me has coronado de honra y de gloria.
¡Qué admirable es tu nombre en toda la tierra!
Mi asombro se vuelve oración.`,
  },
  {
    id: 's20',
    title: 'Salmo 19: Los Cielos Proclaman la Gloria de Dios',
    artist: 'Comunidad Orante',
    artworkUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    audioUrl: audioAt(19),
    category: 'podcast',
    duration: 130,
    lyrics: `Los cielos cuentan la gloria de Dios, y el firmamento anuncia su obra.
Cada día habla al día siguiente, y cada noche enseña a la otra.
Sin palabras ni voces, su mensaje llega a toda la tierra,
y su ley reconforta el alma.`,
  },
];

export const sampleBlogTracks: Track[] = [
  {
    id: 'b1',
    title: 'La Mesa Compartida: Reflexión de Fraternidad',
    artist: 'Sanctify Editorial',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    audioUrl: audioAt(0),
    category: 'blog',
    duration: 0,
    lyrics: `Sentarse a la mesa compartida es el acto supremo de fraternidad y humildad.

Nos invita a dejar a un lado nuestras diferencias y a reconocer al otro como un hermano. Cuando compartimos el alimento, compartimos también historias, silencios y esperanzas.

Que cada comida sea una oportunidad para acoger a quien tenemos cerca.`,
  },
  {
    id: 'b2',
    title: 'Caminar en la Luz de la Verdad',
    artist: 'Dra. María Fernández',
    artworkUrl: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?w=600',
    audioUrl: audioAt(1),
    category: 'blog',
    duration: 0,
    lyrics: `La verdad no es simplemente una teoría. Es un camino que se recorre día a día, con pasos pequeños y decisiones concretas.

Caminar en la luz exige valentía para enfrentar las sombras que llevamos dentro y las que encontramos afuera.

Quien camina con honestidad no tiene que fingir, porque su vida ya habla por sí misma.`,
  },
  {
    id: 'b3',
    title: 'El Poder del Silencio y la Meditación',
    artist: 'Hermano Tomás',
    artworkUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
    audioUrl: audioAt(2),
    category: 'blog',
    duration: 0,
    lyrics: `En un mundo lleno de ruido constante, el silencio es un refugio necesario.

No se trata de huir de la vida, sino de volver al centro. Unos minutos de quietud bastan para ordenar los pensamientos y escuchar lo que realmente importa.

Aprender a escuchar el silencio nos permite conectarnos con lo divino y con nosotros mismos.`,
  },
  {
    id: 'b4',
    title: 'Construyendo Puentes de Reconciliación',
    artist: 'Sanctify Editorial',
    artworkUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600',
    audioUrl: audioAt(3),
    category: 'blog',
    duration: 0,
    lyrics: `El perdón es la llave que abre las puertas del futuro. Sin él, las heridas del pasado se repiten una y otra vez.

Reconciliarse implica humildad, el deseo sincero de sanar y la paciencia para reconstruir la confianza poco a poco.

Un puente no se levanta en un día, pero cada piedra colocada acerca a dos orillas que parecían distantes.`,
  },
  {
    id: 'b5',
    title: 'La Alegría del Servicio Humilde',
    artist: 'Voluntariado Caridad',
    artworkUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600',
    audioUrl: audioAt(4),
    category: 'blog',
    duration: 0,
    lyrics: `Servir a los demás con un corazón dispuesto transforma tanto al que da como al que recibe.

El servicio humilde no busca aplausos. Se expresa en gestos sencillos: escuchar, acompañar, ayudar sin esperar nada a cambio.

Pequeños actos hechos con inmenso amor cambian más el mundo de lo que imaginamos.`,
  },
  {
    id: 'b6',
    title: 'Esperanza en Tiempos de Dificultad',
    artist: 'Sanctify Editorial',
    artworkUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=600',
    audioUrl: audioAt(5),
    category: 'blog',
    duration: 0,
    lyrics: `La esperanza es el ancla del alma durante las tormentas más fuertes. No elimina el viento, pero impide que nos arrastre.

En los tiempos difíciles, la esperanza se cultiva con paciencia, con pequeños pasos y con la compañía de otros que también resisten.

Las noches más oscuras preceden al amanecer, y cada amanecer trae una razón nueva para seguir.`,
  },
  {
    id: 'b7',
    title: 'El Arte de la Gratitud Diaria',
    artist: 'Sofia Gómez',
    artworkUrl: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=600',
    audioUrl: audioAt(6),
    category: 'blog',
    duration: 0,
    lyrics: `Agradecer cada mañana cambia nuestra perspectiva frente a la vida. Basta con nombrar tres cosas buenas antes de levantarse.

La gratitud no niega los problemas, pero nos recuerda que no son lo único que existe. Nos ayuda a ver lo que ya tenemos en lugar de lo que falta.

Reconocer las pequeñas bendiciones nos llena de alegría y de paz.`,
  },
  {
    id: 'b8',
    title: 'El Significado del Pan Roto',
    artist: 'Padre Mateo',
    artworkUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    audioUrl: audioAt(7),
    category: 'blog',
    duration: 0,
    lyrics: `El pan que se parte y se comparte representa la entrega total. No se multiplica guardándolo, sino dándolo.

Cuando lo recibimos, nos reconocemos parte de una misma familia. Cuando lo ofrecemos, nos vaciamos un poco para que otros tengan vida.

Nuestras vidas adquieren sentido cuando nos ofrecemos en beneficio de otros.`,
  },
  {
    id: 'b9',
    title: 'Cuidar la Creación con Responsabilidad',
    artist: 'EcoSanctify',
    artworkUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
    audioUrl: audioAt(8),
    category: 'blog',
    duration: 0,
    lyrics: `La naturaleza es un regalo confiado a nuestra custodia. No somos dueños absolutos, sino guardianes de lo que recibimos.

Cuidar el agua, el suelo y el aire es una forma concreta de amar al prójimo, especialmente a quienes vendrán después de nosotros.

Proteger nuestro entorno es un deber moral que se vive en lo cotidiano, con decisiones pequeñas y constantes.`,
  },
  {
    id: 'b10',
    title: 'La Fe que Mueve Corazones',
    artist: 'Sanctify Editorial',
    artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600',
    audioUrl: audioAt(9),
    category: 'blog',
    duration: 0,
    lyrics: `La fe no es ausencia de dudas, sino la convicción de seguir adelante aun cuando no vemos todo el camino.

Es una confianza que se alimenta en la oración, en la comunidad y en los actos de bondad que hacemos sin esperar reconocimiento.

Es el impulso interior hacia la justicia, la misericordia y la verdad.`,
  },
];

export const tracks: Track[] = [
  ...sampleMusicTracks,
  ...samplePodcastTracks,
  ...sampleBlogTracks,
];
