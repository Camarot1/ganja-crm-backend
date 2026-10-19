import express, { Request, Response } from 'express'
import db from './db'
import { ResultSetHeader } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'

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
        const [slotsLehgth]: any = await db.execute('select * from warehouse_slots where warehouse_id = ?', [id])
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

router.post('/layout/deleteslot/:id', async(req: Request<{id: string}>, res: Response) => {
    const id = req.params.id
    const data = req.body.value
    try{
       await db.execute('DELETE FROM warehouse_slots where warehouse_id = ? and  code = ?', [id, data])
       res.status(200).json('Удален слот')
    }catch(error){
        console.log(error)
        res.json('error')
    }
})


export default router