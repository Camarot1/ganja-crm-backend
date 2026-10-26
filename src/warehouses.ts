import express, { Request, Response } from 'express'
import db from './db'
import { ResultSetHeader } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'

import { type Type, type NotLayoutCommand, AnalyzeLayoutItem, LayoutCommand } from '../logic/notlayout'

const router = express.Router()

interface Warehouses extends RowDataPacket {
    id: number,
    name: string,
    code: string,
    address: string,
    is_active: number
}

router.get('/', async (req: Request, res: Response) => {
    const [result] = await db.execute<Warehouses[]>('SELECT * FROM warehouses')
    if (result.length === 0) {
        return res.status(404).json({ message: 'Нет складов' })
    }
    const saveResult = result.map((item: Warehouses) => {
        const { id, name, code, address, is_active } = item
        return { id, name, code, address, is_active }
    })
    // безопасно выводить только нужные переменные из всех строк таблицы
    // сколько бы не добавлялось сюда, для вывода на фронт добавить сюда
    res.status(200).json(saveResult)
})

router.get('/test', async (req: Request, res: Response) => {
    try {
        const [result] = await db.execute('SELECT a.warehouse_id, a.slot_code, a.product_id, p.name AS product_name, p.sku, a.quantity FROM stock_slot_allocations AS a JOIN products AS p ON p.id = a.product_id WHERE a.warehouse_id = 1;')
        console.log(result)

        res.json({ product: result })
    } catch (error) {
        console.log(error)
    }
})

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id

    const [result] = await db.execute("Select * from warehouses where id = ?", [id])
    res.status(200).json(result)
})

interface AddWarehouses {
    name: string
    code: string
    address: string
}

router.post('/add', async (req: Request<{}, any, AddWarehouses>, res: Response) => {
    const { name, code, address } = req.body

    if (!name || !code || !address) {
        return res.status(500).json({ message: 'Не указанно название код или адрес' })
    }
    try {
        const [result] = await db.execute<ResultSetHeader>('INSERT INTO warehouses (name, code ,address) values (?,?,?)', [name, code, address])
        // добавить логику автоматического добавления товаров на склад с нулевым количеством при создании

        res.status(200).json({ message: 'Успешное создание склада' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Ошибка при добавлении склада' })
    }
})

router.get('/info', async (req: Request, res: Response) => {
    try {
        const [result] = await db.execute('SELECT p.name, p.sku, s.quantity, p.unit FROM stock s JOIN products p ON s.product_id = p.id;')
        console.log(result)
        res.status(200).json({ message: `Результат` })
    } catch (error) {
        console.log(error)
    }
})

router.get('/info/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {
        const [result] = await db.execute('SELECT p.id, p.name, p.sku, s.quantity, p.unit FROM stock s JOIN products p ON s.product_id = p.id WHERE s.warehouse_id = ?;', [id])
        res.status(200).json(result)
    } catch (error) {
        console.log(error)
    }
})

router.get('/history/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {
        const [result] = await db.execute('SELECT * from history where warehouse_id = ?', [id])
        res.status(200).json(result)
    } catch (error) {
        console.log(error)
    }
})

router.get('/layout/info/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {

    } catch (error) {
        console.log(error)
        res.json(error)
    }
})

router.get('/layout/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {
        const respon = []
        const [slotsLehgth]: any = await db.execute('SELECT id, warehouse_id, code FROM warehouse_slots WHERE warehouse_id = 1 ORDER BY CAST(code AS UNSIGNED) ASC;', [id])
        // обязательно прописывать везде вот такой запрос для получения всех полей, потому что поле в бд varchar и оно отрисовывает как 1 10 11 2 3
        for (let i = 0; i < slotsLehgth.length; i++) {
            const [test] = await db.execute("SELECT p.id, p.name, p.sku, a.quantity FROM stock_slot_allocations AS a JOIN products AS p ON p.id = a.product_id WHERE a.warehouse_id = ? AND a.slot_code = ?;", [id, i + 1])
            const slot = String(slotsLehgth[i].code).padStart(3, '0')
            respon.push({ id: i + 1, warehouse_id: id, code: slot, is_active: true, products: test })
        }
        // const [slots] = await db.execute('SELECT a.warehouse_id, a.slot_code, a.product_id, p.name AS product_name, p.sku, a.quantity FROM stock_slot_allocations AS a JOIN products AS p ON p.id = a.product_id WHERE a.warehouse_id = ?', [id])
        // const [test] = await db.execute("SELECT p.id, p.name, p.sku, a.quantity FROM stock_slot_allocations AS a JOIN products AS p ON p.id = a.product_id WHERE a.warehouse_id = ? AND a.slot_code = '1';", [id])

        res.json(respon)
    } catch (error) {
        console.log(error)
        res.json(error)
    }
})
import { ItemLayout } from './products'
interface Layout {
    id: number
    warehouse_id: string
    code: string
    is_active?: string
    products: ItemLayout[]
}


interface Slots {
    id: number
    warehouse_id: number
    code: number
}

router.post('/layout/addslot/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {
        const [result] = await db.execute<ResultSetHeader>(`INSERT INTO warehouse_slots (warehouse_id, code) SELECT ?, COALESCE(MAX(CAST(code AS UNSIGNED)), 0) + 1 FROM warehouse_slots WHERE warehouse_id = ?`,
            [id, id]);
        res.status(200).json(`Добавлен слот`)
    } catch (error) {
        console.log(error)
        res.json('error')
    }
})

router.post('/layout/deleteslot/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    const data = req.body.value
    try {
        await db.execute('DELETE FROM warehouse_slots where warehouse_id = ? and  code = ?', [id, data])
        res.status(200).json('Удален слот')
    } catch (error) {
        console.log(error)
        res.json('error')
    }
})

interface HighlightValue extends ItemLayout {
    table_id: number
}

interface Hightlight {
    idCard: number
    value: HighlightValue
}

router.post('/layout/additem/:id', async (req: Request<{ id: string }, any, Hightlight>, res: Response) => {
    const id = Number(req.params.id)
    const data = req.body
    const tableId = data.value.table_id
    console.log(data)
    try {
        await db.execute<ResultSetHeader>(`INSERT INTO stock_slot_allocations (warehouse_id, slot_code, product_id, quantity) values (?,?,?,?)`, [id, data.idCard, data.value.id, data.value.quantity])
        const [quantity]: any = await db.execute('select quantity from not_layout_item where id = ?', [tableId])
        const command = AnalyzeLayoutItem(data.value.quantity, quantity[0].quantity, tableId)
        if (command.type == 'ERROR') {
            res.status(400).json({ message: command.message! })
        }
        await LayoutCommand(command)
        res.status(200).json('ok')
    } catch (error) {
        console.log(error)
        res.status(400).json('При добавлении произошла ошибка')
    }
})

router.get('/layout/notlayout/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {
        const [data] = await db.execute('SELECT nli.id AS table_id, nli.product_id as id, p.name AS name, p.sku AS sku, nli.quantity as quantity FROM not_layout_item nli LEFT JOIN products p ON nli.product_id = p.id WHERE nli.warehouse_id = ?', [id])
        res.status(200).json(data)
    } catch (error) {
        console.log(error)
        res.status(400).json('Произошла ошибка')
    }
})

router.get('/layout/count/:id', async (req: Request<{ id: string }>, res: Response) => {
    const id = req.params.id
    try {
        const [slots]: any = await db.execute('select * from warehouse_slots where warehouse_id = ?', [id])
        const [layout]: any = await db.execute('select * from stock_slot_allocations where warehouse_id = ?', [id])
        const [free1]: any = await db.execute('SELECT COUNT(*) AS empty_slots FROM warehouse_slots ws WHERE ws.warehouse_id = ? AND NOT EXISTS ( SELECT 1 FROM stock_slot_allocations ssa WHERE ssa.warehouse_id = ws.warehouse_id AND ssa.slot_code = ws.code)', [id])
        const total = slots.length
        const free = free1[0].empty_slots
        const occupied = total - free
        const [allocated]: any = await db.execute(`SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM stock_slot_allocations WHERE warehouse_id = ?`, [id]);
        const [unllocated]: any = await db.execute(`SELECT COALESCE(SUM(quantity), 0) as total_quantity from not_layout_item where warehouse_id = ?`, [id])
        res.status(200).json({
            totalSlots: total,
            freeSlots: free, occupiedSlots: occupied,
            totalStock: Number(allocated[0].total_quantity) + Number(unllocated[0].total_quantity),
            allocated: Number(allocated[0].total_quantity),
            unlocated: Number(unllocated[0].total_quantity)
        })
    } catch (error) {
        console.log(error)
    }
})


export default router
