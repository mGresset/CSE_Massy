/* CSE Studio · Composer le MEL · catalogue de référence issu du MEL W46 (33 pages) */
(function (root) {
'use strict';
const SECTIONS = ['Couverture','Permanences','Nouveautés','En cours','Dernière semaine','Informations','Partenaires','Animations','À venir','Règlement'];
const CATEGORIES = ['Informations','Voyages','Week-ends','Animations','Sorties culturelles','Musiques','Œnologie','Sport','Randonnées','Sports mécaniques','Parapentes','Couture','Dessins','La Ruche'];
const TEMPLATES = [
 {id:'cover',label:'Couverture du MEL',hint:'Éditorial, informations importantes, dernières chances et trois nouveautés.',reference:1},
 {id:'calendar',label:'Permanences / planning',hint:'Calendrier mensuel interactif, codes couleur, horaires, contact et catalogue.',reference:2},
 {id:'information',label:'Information CSE',hint:'Communication administrative, consignes, rappels ou procédure.',reference:4},
 {id:'activity',label:'Fiche activité',hint:'Description, photos, date, tarifs facultatifs, points et contacts.',reference:12},
 {id:'deadline',label:'Dernière chance',hint:'Mise en avant d’une date limite d’inscription et des disponibilités.',reference:9},
 {id:'immersive',label:'Visuel immersif',hint:'Photo grand format à gauche et informations à droite.',reference:17},
 {id:'partner',label:'Partenaire / avantage',hint:'Logo ou visuel partenaire, offre, dates et code promotionnel.',reference:29},
 {id:'poster',label:'Animation / affiche',hint:'Mise en page événementielle et programme libre.',reference:23},
 {id:'agenda',label:'À venir · liste',hint:'Liste chronologique par catégorie, alimentation manuelle ou automatique.',reference:26},
 {id:'table',label:'À venir · tableau',hint:'Tableau des visites : intitulé, lieu, type et date.',reference:27},
 {id:'rules',label:'Règlement / modalités',hint:'Deux colonnes de règles et d’informations durables.',reference:32}
];
const DEFAULT_SETTINGS={week:46,year:2026,newsletterDate:'2026-11-09',title:'MEL DU CSE',cseUrl:'https://cethaleslasmassy.portailce.com/',canvaUrl:'https://canva.link/rewv8gx5iilr8kz',planningUrl:'',footer:'CSE THALES LAS MASSY · Informations susceptibles d’évoluer',rates:[70,65,60,55,50,45,40,35,30,25]};
const BLANK = {id:'',kind:'activity',section:'En cours',included:true,originPage:0,title:'',subtitle:'',category:'Informations',location:'',date:'',dateEnd:'',deadline:'',description:'',details:'',highlight:'',contact:'',image:'',image2:'',badge:'',priceEnabled:false,pricingMode:'tranches',outsidePrice:'',fixedPrice:'',fixedPercent:'',manualPrices:'',priceNotes:'',minParticipants:'',maxParticipants:'',points:'',counter:'',carbon:'',age:'',code:'',linkType:'cse',linkCustom:'',linkLabel:'Plus d’infos',calendarMonth:'2026-11',scheduleDays:{},openHours:'13h–16h',shortHours:'14h30–16h',catalogueUrl:'',agendaRows:[],footerText:''};
const COPY_REG1="Texte des modalités d’inscription à renseigner et faire valider.\n\nSite du CSE : modalités de réservation.\n\nAccueil CSE : horaires et contact.\n\nPaiement : selon règlement en vigueur.";
const COPY_REG2="Texte du règlement à renseigner et faire valider.\n\nPaiement des activités et conditions applicables.\n\nConditions de désistement, remboursement et assurances.";
const DEMO = [
 [
  "cover",
  "Couverture",
  "EXEMPLE — Couverture du MEL 1",
  {
   "originPage": 1,
   "highlight": "Indiquer ici une information importante pour les bénéficiaires.",
   "description": "Une activité proche de sa clôture d’inscription sera reprise ici.",
   "details": "Message éditorial de la semaine.",
   "linkLabel": "Consulter le planning CSE"
  }
 ],
 [
  "calendar",
  "Permanences",
  "EXEMPLE — Permanences / planning 2",
  {
   "originPage": 2,
   "calendarMonth": "2026-11",
   "openHours": "Horaires à compléter",
   "shortHours": "Horaires réduits à compléter",
   "contact": "Accueil CSE",
   "description": "Service CSE à personnaliser"
  }
 ],
 [
  "calendar",
  "Permanences",
  "EXEMPLE — Permanences / planning 3",
  {
   "originPage": 3,
   "calendarMonth": "2026-11",
   "openHours": "Horaires à compléter",
   "shortHours": "Horaires réduits à compléter",
   "contact": "Accueil CSE",
   "description": "Service CSE à personnaliser"
  }
 ],
 [
  "information",
  "Informations",
  "EXEMPLE — Information CSE 4",
  {
   "originPage": 4,
   "category": "Informations",
   "description": "Contenu de démonstration à remplacer par les informations validées du CSE.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus"
  }
 ],
 [
  "information",
  "Informations",
  "EXEMPLE — Information CSE 5",
  {
   "originPage": 5,
   "category": "Informations",
   "description": "Contenu de démonstration à remplacer par les informations validées du CSE.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus"
  }
 ],
 [
  "information",
  "Informations",
  "EXEMPLE — Information CSE 6",
  {
   "originPage": 6,
   "category": "Informations",
   "description": "Contenu de démonstration à remplacer par les informations validées du CSE.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus"
  }
 ],
 [
  "information",
  "Informations",
  "EXEMPLE — Information CSE 7",
  {
   "originPage": 7,
   "category": "Informations",
   "description": "Contenu de démonstration à remplacer par les informations validées du CSE.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus"
  }
 ],
 [
  "deadline",
  "Dernière semaine",
  "EXEMPLE — Dernière chance 8",
  {
   "originPage": 8,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "deadline",
  "Dernière semaine",
  "EXEMPLE — Dernière chance 9",
  {
   "originPage": 9,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "deadline",
  "Dernière semaine",
  "EXEMPLE — Dernière chance 10",
  {
   "originPage": 10,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "deadline",
  "Dernière semaine",
  "EXEMPLE — Dernière chance 11",
  {
   "originPage": 11,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "Nouveautés",
  "EXEMPLE — Fiche activité 12",
  {
   "originPage": 12,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "Nouveautés",
  "EXEMPLE — Fiche activité 13",
  {
   "originPage": 13,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "Nouveautés",
  "EXEMPLE — Fiche activité 14",
  {
   "originPage": 14,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "partner",
  "Partenaires",
  "EXEMPLE — Partenaire / avantage 15",
  {
   "originPage": 15,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "information",
  "Informations",
  "EXEMPLE — Information CSE 16",
  {
   "originPage": 16,
   "category": "Informations",
   "description": "Contenu de démonstration à remplacer par les informations validées du CSE.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus"
  }
 ],
 [
  "immersive",
  "En cours",
  "EXEMPLE — Visuel immersif 17",
  {
   "originPage": 17,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "immersive",
  "En cours",
  "EXEMPLE — Visuel immersif 18",
  {
   "originPage": 18,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "En cours",
  "EXEMPLE — Fiche activité 19",
  {
   "originPage": 19,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "En cours",
  "EXEMPLE — Fiche activité 20",
  {
   "originPage": 20,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "En cours",
  "EXEMPLE — Fiche activité 21",
  {
   "originPage": 21,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "En cours",
  "EXEMPLE — Fiche activité 22",
  {
   "originPage": 22,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "poster",
  "Animations",
  "EXEMPLE — Animation / affiche 23",
  {
   "originPage": 23,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "Animations",
  "EXEMPLE — Fiche activité 24",
  {
   "originPage": 24,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "activity",
  "Animations",
  "EXEMPLE — Fiche activité 25",
  {
   "originPage": 25,
   "category": "Animations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "agenda",
  "À venir",
  "EXEMPLE — À venir · liste 26",
  {
   "originPage": 26,
   "category": "Œnologie",
   "agendaRows": [
    {
     "date": "2027-01-15",
     "title": "Activité de démonstration 1",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-02-15",
     "title": "Activité de démonstration 2",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-03-15",
     "title": "Activité de démonstration 3",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-04-15",
     "title": "Activité de démonstration 4",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-05-15",
     "title": "Activité de démonstration 5",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-06-15",
     "title": "Activité de démonstration 6",
     "location": "Lieu à définir",
     "status": "À venir"
    }
   ]
  }
 ],
 [
  "table",
  "À venir",
  "EXEMPLE — À venir · tableau 27",
  {
   "originPage": 27,
   "category": "Sorties culturelles",
   "agendaRows": [
    {
     "date": "2027-01-15",
     "title": "Activité de démonstration 1",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-02-15",
     "title": "Activité de démonstration 2",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-03-15",
     "title": "Activité de démonstration 3",
     "location": "Lieu à définir",
     "status": "À venir"
    },
    {
     "date": "2027-04-15",
     "title": "Activité de démonstration 4",
     "location": "Lieu à définir",
     "status": "À venir"
    }
   ]
  }
 ],
 [
  "calendar",
  "Permanences",
  "EXEMPLE — Permanences / planning 28",
  {
   "originPage": 28,
   "calendarMonth": "2026-11",
   "openHours": "Horaires à compléter",
   "shortHours": "Horaires réduits à compléter",
   "contact": "Accueil CSE",
   "description": "Service CSE à personnaliser"
  }
 ],
 [
  "partner",
  "Partenaires",
  "EXEMPLE — Partenaire / avantage 29",
  {
   "originPage": 29,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "partner",
  "Partenaires",
  "EXEMPLE — Partenaire / avantage 30",
  {
   "originPage": 30,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "partner",
  "Partenaires",
  "EXEMPLE — Partenaire / avantage 31",
  {
   "originPage": 31,
   "category": "Informations",
   "description": "Une présentation claire de l’activité, à renseigner par les bénévoles.",
   "contact": "Référent CSE",
   "linkLabel": "En savoir plus",
   "date": "2027-03-15",
   "deadline": "2027-02-28",
   "details": "Détail de l’événement ou conditions de participation.",
   "priceEnabled": false,
   "image": "",
   "image2": ""
  }
 ],
 [
  "rules",
  "Règlement",
  "EXEMPLE — Règlement / modalités 32",
  {
   "originPage": 32,
   "description": "RUBRIQUE À COMPLÉTER\n\nAjouter ici le règlement actuellement en vigueur du CSE.\n\n1. Modalités de réservation et d’inscription.\n2. Paiements et éventuelles conditions d’annulation.\n3. Cas particuliers et coordonnées utiles.\n\nFaire valider cette version par les responsables du CSE avant publication.",
   "highlight": "Texte du règlement à vérifier avant diffusion."
  }
 ],
 [
  "rules",
  "Règlement",
  "EXEMPLE — Règlement / modalités 33",
  {
   "originPage": 33,
   "description": "RUBRIQUE À COMPLÉTER\n\nAjouter ici le règlement actuellement en vigueur du CSE.\n\n1. Modalités de réservation et d’inscription.\n2. Paiements et éventuelles conditions d’annulation.\n3. Cas particuliers et coordonnées utiles.\n\nFaire valider cette version par les responsables du CSE avant publication.",
   "highlight": "Texte du règlement à vérifier avant diffusion."
  }
 ]
];
function makeSlide(kind,section,title,extra){return {...BLANK,id:'mel-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),kind:kind||'activity',section:section||'En cours',title:title||'',...(extra||{}),scheduleDays:{...(extra?.scheduleDays||{})},agendaRows:Array.isArray(extra?.agendaRows)?extra.agendaRows.map(a=>({...a})):[]};}
function demoSlides(){return DEMO.map(row=>makeSlide(row[0],row[1],row[2],row[3]));}
function starterSlides(){return [
 makeSlide('cover','Couverture','MEL DU CSE',{description:'',details:'',highlight:''}),
 makeSlide('calendar','Permanences','Permanences du CSE',{calendarMonth:new Date().toISOString().slice(0,7),contact:'Assistantes du CSE'}),
 makeSlide('calendar','Permanences','Prêt de matériel',{calendarMonth:new Date().toISOString().slice(0,7),contact:'Service prêt matériel'}),
 makeSlide('rules','Règlement','Modalités d’inscription aux activités du CSE',{description:COPY_REG1}),
 makeSlide('rules','Règlement','Paiement et désistement',{description:COPY_REG2,highlight:'Toute inscription doit être accompagnée de son paiement.'})
];}
root.MEL_DATA={SECTIONS,CATEGORIES,TEMPLATES,DEFAULT_SETTINGS,BLANK,DEMO,demoSlides,starterSlides,makeSlide,COPY_REG1,COPY_REG2};
})(window);
