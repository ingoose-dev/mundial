import { continentes, grupos, selecciones, partidos } from './datos-mundial.js'
import express from 'express'
import cors from 'cors'
const app = express()
app.use(express.json())
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type'],
}))
const PORT = 3000



//------ Rutas de la API -------------------------------------------------------------

app.get('/api/selecciones', (req, res) => {
    const continente = req.query.continente
    const campeon = req.query.campeon

    //Valida que campeon sea un booleano si es que se pasa
    if (campeon && campeon !== 'true' && campeon !== 'false') {
        res.status(400).json({ error: 'El parámetro "campeon" debe ser true o false' })
        return
    }

    //valida que el continente exista si es que se pasa
    if (continente) {
        if (!validaContinente(continente)) {
            res.status(404).json({ error: 'Continente no existe' })
            return
        }
    }

    //api/selecciones?continente=xxx
    if (continente && !campeon) {
        const seleccionesFiltradas = selecciones.filter(s => s.continenteId === validaContinente(continente))
        res.status(200).json(seleccionesFiltradas)
    }

    //api/selecciones?continente=xxx&campeon=true
    if (continente && campeon === 'true') {
        const seleccionesFiltradas = selecciones.filter(s => s.continenteId === validaContinente(continente) && s.copas.length > 0)
        res.status(200).json(seleccionesFiltradas)
    }

    //api/selecciones?campeon=true
    if (campeon === 'true') {
        const seleccionesFiltradas = selecciones.filter(s => s.copas.length > 0)
        res.status(200).json(seleccionesFiltradas)
    }

    //api/selecciones?campeon=false
    if (campeon === 'false') {
        const seleccionesFiltradas = selecciones.filter(s => s.copas.length === 0)
        res.status(200).json(seleccionesFiltradas)
    }

    //api/selecciones sin filtros
    if (!continente && !campeon) {
        res.status(200).json(selecciones)
    }


})

app.get('/api/selecciones/:id', (req, res) => {
    const id = validaSeleccion(req.params.id)
    const seleccion = selecciones.find(s => s.id === id)
    if (seleccion) {
        res.json(seleccion)
    } else {
        res.status(404).json({ error: 'Selección no encontrada' })
    }
})

app.get('/api/copas', (req, res) => {
    const copas = selecciones.flatMap(s => s.copas)
    //ordena las copas de menor a mayor
    copas.sort((a, b) => a - b)
    res.status(200).json(copas)
})

app.get('/api/copas/:seleccion', (req, res) => {
    const seleccion = req.params.seleccion ? validaSeleccion(req.params.seleccion) : null
    if (seleccion) {
        const copas = selecciones.find(s => s.id === validaSeleccion(seleccion))?.copas
        if (copas.length > 0) {
            res.status(200).json(copas)
        } else {
            res.status(200).json([])
        }
    } else {
        res.status(404).json({ error: 'Selección no encontrada' })
    }
})


app.post('/api/worldcup/2026/semifinals/:n', (req, res) => {
    //validar que sea un número
    const n = parseInt(req.params.n)
    if (isNaN(n)) {
        res.status(400).json({ error: 'El número de semifinal debe estar entre 1 y 4' })
        return
    }

    if (n < 1 || n > 4) {
        res.status(400).json({ error: 'El número de semifinal debe estar entre 1 y 4' })
        return
    }
    const { local, visita } = req.body

    if (!local || !visita) {
        res.status(400).json({ error: 'Faltan datos del partido' })
        return
    }

    //valida que los datos de local y visita sean correctos
    if (!validaSeleccion(local.seleccionId) || !validaSeleccion(visita.seleccionId)) {
        res.status(400).json({ error: 'Selección local o visita no válida' })
        return
    }


    local.seleccionId = validaSeleccion(local.seleccionId)
    visita.seleccionId = validaSeleccion(visita.seleccionId)

    //valida que los goles sean números
    if (isNaN(local.goles) || isNaN(visita.goles)) {
        res.status(400).json({ error: 'Los goles deben ser números' })
        return
    }

    //valida que los goles no sean negativos
    if (local.goles < 0 || visita.goles < 0) {
        res.status(400).json({ error: 'Los goles no pueden ser negativos' })
        return
    }

    //valida que no se repitan las selecciones en la misma semifinal
    if (local.seleccionId === visita.seleccionId) {
        res.status(400).json({ error: 'La selección local y visita no pueden ser la misma' })
        return
    }

    //valida que los datos enviados existan y que no sean nulos
    if (!local || !visita || !local.seleccionId || !visita.seleccionId || local.goles === undefined || visita.goles === undefined) {
        res.status(400).json({ error: 'Faltan datos del partido' })
        return
    }

    partidos.semifinales[n - 1] = { numero: n, local, visita }
    res.status(201).json({ message: `Semifinal ${n} registrada` })

})

app.get('/api/worldcup/2026/semifinals/:n', (req, res) => {
    const n = parseInt(req.params.n)
    if (n < 1 || n > 4) {
        res.status(400).json({ error: 'El número de semifinal debe estar entre 1 y 4' })
        return
    }
    const semifinal = partidos.semifinales[n - 1]
    if (semifinal) {
        const data = {
            "partido": semifinal.numero,
            "local": {
                "seleccion": selecciones.find(s => s.id === semifinal.local.seleccionId).nombre,
                "goles": semifinal.local.goles
            },
            "visita": {
                "seleccion": selecciones.find(s => s.id === semifinal.visita.seleccionId).nombre,
                "goles": semifinal.visita.goles
            },
            "ganador": (semifinal.local.goles > semifinal.visita.goles) ? selecciones.find(s => s.id === semifinal.local.seleccionId).nombre : selecciones.find(s => s.id === semifinal.visita.seleccionId).nombre

        }
        res.status(200).json(data)
    } else {
        res.status(404).json({ error: `Semifinal ${n} no registrada` })
    }
})

app.get('/api/worldcup/2026/semifinals', (req, res) => {
    //validar que existan semifinales registradas
    if (partidos.semifinales.length === 0) {
        res.status(404).json({ error: 'No hay semifinales registradas' })
        return
    }
    const semifinales = partidos.semifinales.map(s => {
        return {
            "partido": s.numero,
            "local": {
                "seleccion": selecciones.find(sel => sel.id === s.local.seleccionId).nombre,
                "goles": s.local.goles
            },
            "visita": {
                "seleccion": selecciones.find(sel => sel.id === s.visita.seleccionId).nombre,
                "goles": s.visita.goles
            },
            "ganador": (s.local.goles > s.visita.goles) ? selecciones.find(sel => sel.id === s.local.seleccionId).nombre : selecciones.find(sel => sel.id === s.visita.seleccionId).nombre
        }
    })
    res.status(200).json(semifinales)
})

app.post('/api/worldcup/2026/final', (req, res) => {
    const { local, visita } = req.body
    //valida que los datos de local y visita sean correctos
    if (!validaSeleccion(local.seleccionId) || !validaSeleccion(visita.seleccionId)) {
        res.status(400).json({ error: 'Selección local o visita no válida' })
        return
    }

    local.seleccionId = validaSeleccion(local.seleccionId)
    visita.seleccionId = validaSeleccion(visita.seleccionId)

    //valida que los goles sean números
    if (isNaN(local.goles) || isNaN(visita.goles)) {
        res.status(400).json({ error: 'Los goles deben ser números' })
        return
    }

    //valida que los goles no sean negativos
    if (local.goles < 0 || visita.goles < 0) {
        res.status(400).json({ error: 'Los goles no pueden ser negativos' })
        return
    }

    //valida que no se repitan las selecciones en la final
    if (local.seleccionId === visita.seleccionId) {
        res.status(400).json({ error: 'La selección local y visita no pueden ser la misma' })
        return
    }

    //valida que los datos enviados existan y que no sean nulos
    if (!local || !visita || !local.seleccionId || !visita.seleccionId || local.goles === undefined || visita.goles === undefined) {
        res.status(400).json({ error: 'Faltan datos del partido' })
        return
    }

    partidos.final = { local, visita }

    //ganador de la final (**DESAFIO**)
    const ganador = (local.goles > visita.goles) ? local.seleccionId : visita.seleccionId
    selecciones.find(s => s.id === ganador).copas.push(2026)
    res.status(201).json({ message: 'Final registrada' })
})

app.get('/api/worldcup/2026/final', (req, res) => {
    if (partidos.final) {
        const data = {
            "local": {
                "seleccion": selecciones.find(s => s.id === partidos.final.local.seleccionId).nombre,
                "goles": partidos.final.local.goles
            },
            "visita": {
                "seleccion": selecciones.find(s => s.id === partidos.final.visita.seleccionId).nombre,
                "goles": partidos.final.visita.goles
            },
            "ganador": (partidos.final.local.goles > partidos.final.visita.goles) ? selecciones.find(s => s.id === partidos.final.local.seleccionId).nombre : selecciones.find(s => s.id === partidos.final.visita.seleccionId).nombre
        }
        res.status(200).json(data)
    } else {
        res.status(404).json({ error: 'Final no registrada' })
    }
})

app.get('/api/estadisticas', (req, res) => {
    const totalSelecciones = selecciones.length
    const totalCopas = selecciones.reduce((acc, s) => acc + s.copas.length, 0)
    const campeones = selecciones.filter(s => s.copas.length > 0).map(s => ({ nombre: s.nombre, copas: s.copas.length }))
    const seleccionesPorContinente = continentes.map(c => {
        return {
            continente: c.nombre,
            cantidad: selecciones.filter(s => s.continenteId === c.id).length
        }
    })
    const rankingPromedio = (selecciones.reduce((acc, s) => acc + s.fifaRanking, 0) / totalSelecciones).toFixed(2)
    res.status(200).json({
        totalSelecciones,
        totalCopas,
        campeones,
        seleccionesPorContinente,
        rankingPromedio
    })
})

app.get('/api/grupos/:nombre/tabla', (req, res) => {
    const nombreGrupo = req.params.nombre
    const grupo = grupos.find(g => g.nombre.toUpperCase() === nombreGrupo.toUpperCase())
    if (!grupo) {
        res.status(404).json({ error: 'Grupo no encontrado' })
        return
    }

    //selecciones ordenadas por su ranking FIFA y luego por nombre
    const seleccionesGrupo = selecciones.filter(s => s.grupoId === grupo.id)
    const tabla = seleccionesGrupo.sort((a, b) => {
        if (a.fifaRanking === b.fifaRanking) {
            return a.nombre.localeCompare(b.nombre)
        }
        return a.fifaRanking - b.fifaRanking
    }).map(s => {
        return {
            nombre: s.nombre,
            fifaRanking: s.fifaRanking
        }
    })
    res.status(200).json(tabla)
})

app.get('/api/worldcup/2026/camino/:seleccionId', (req, res) => {
    const seleccionId = parseInt(req.params.seleccionId)
    const seleccion = selecciones.find(s => s.id === seleccionId)
    if (!seleccion) {
        res.status(404).json({ error: 'Selección no encontrada' })
        return
    }
    //partidos de semifinales y final
    const semifinales = partidos.semifinales.filter(s => s.local.seleccionId === seleccionId || s.visita.seleccionId === seleccionId)

    //valida si la selecion jugo semifinales
    if (semifinales.length === 0) {
        res.status(404).json({ error: 'La selección no jugó las semifinales' })
        return
    }


    const final = partidos.final && (partidos.final.local.seleccionId === seleccionId || partidos.final.visita.seleccionId === seleccionId) ? partidos.final : null

    res.status(200).json({
        seleccion: seleccion.nombre,
        semifinales: semifinales.map(s => {
            return {
                partido: s.numero,
                local: selecciones.find(sel => sel.id === s.local.seleccionId).nombre,
                golesLocal: s.local.goles,
                visita: selecciones.find(sel => sel.id === s.visita.seleccionId).nombre,
                golesVisita: s.visita.goles,
                ganador: (s.local.goles > s.visita.goles) ? selecciones.find(sel => sel.id === s.local.seleccionId).nombre : selecciones.find(sel => sel.id === s.visita.seleccionId).nombre
            }
        }),
        final: final ? {
            local: selecciones.find(sel => sel.id === final.local.seleccionId).nombre,
            golesLocal: final.local.goles,
            visita: selecciones.find(sel => sel.id === final.visita.seleccionId).nombre,
            golesVisita: final.visita.goles,
            ganador: (final.local.goles > final.visita.goles) ? selecciones.find(sel => sel.id === final.local.seleccionId).nombre : selecciones.find(sel => sel.id === final.visita.seleccionId).nombre
        } : null
    })
})

app.listen(PORT, () => {
    console.log(`⚽ API del Mundial escuchando en http://localhost:${PORT}`)
})

function toCamelCase(str) {
    return str
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
}

function validaContinente(continente) {

    let idContinente = null
    //valida que el continente sea un string o un número
    const esNumero = !isNaN(parseInt(continente)) && isFinite(continente)

    if (esNumero) {
        //valida que sea entero
        if (parseFloat(continente) % 1 === 0) {
            idContinente = parseInt(continente)
        } else {
            idContinente = null
        }
    } else {
        const continenteBuscar = toCamelCase(continente)
        idContinente = continentes.find(c => toCamelCase(c.nombre) === continenteBuscar)?.id
        if (!idContinente) {
            idContinente = null
        }
    }
    return idContinente

}

function validaSeleccion(nombreSeleccion) {
    let idSeleccion = null
    const esNumero = !isNaN(parseInt(nombreSeleccion)) && isFinite(nombreSeleccion)
    if (esNumero) {
        //valida que sea entero
        if (parseFloat(nombreSeleccion) % 1 === 0) {
            idSeleccion = parseInt(nombreSeleccion)
        } else {
            idSeleccion = null
        }
    } else {
        const nombreBuscar = toCamelCase(nombreSeleccion)
        idSeleccion = selecciones.find(s => toCamelCase(s.nombre) === nombreBuscar)?.id
        if (!idSeleccion) {
            idSeleccion = null
        }
    }
    return idSeleccion
}
