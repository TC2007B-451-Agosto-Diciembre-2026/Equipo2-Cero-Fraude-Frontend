# Cero Fraude

App web para el sistema Cero Fraude, una plataforma para el registro y consulta de reportes de fraude.

## Contribuidores

- Armando Vásquez
- Diego Martínez
- Hugo Rodríguez
- Mariana González

## Requisitos

* Node.js
* npm
* Backend de Cero Fraude

## Instalación

Clonar el repositorio:
```bash
$ git clone https://github.com/TC2007B-451-Agosto-Diciembre-2026/Equipo2-Cero-Fraude-Frontend.git
$ cd cero-fraude-web
```

Instalar dependencias:
```bash
$ npm install
```

## Configuración

Renombrar el archivo ```.env.example``` a ```.env```.

Configurar la URL de la API:

```VITE_API=http://localhost:3000```

> El backend debe de estar en ejecución

## Ejecución


Para iniciar el servidor de desarrollo:
```bash
$ npm run dev
```

Para generar una versión de producción:
```bash
$ npm run build
```

## Pruebas

```bash
$ npm run test
$ npm run test:e2e
$ npm run test:cov
```

## Estructura del proyecto
```text
src/
├── assets/ 
│
├── components/ 
│   ├── common/
│   └── layout/
│
├── features/ 
│
├── pages/ 
│
├── routes/ 
│
├── hooks/ 
│
├── context/ 
│
├── services/ 
│   └── api.ts
│
├── utils/ 
│
├── styles/ 
│
├── types/
│
├── App.tsx
└── main.tsx
```

