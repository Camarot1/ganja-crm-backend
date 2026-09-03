import express, { Request, Response } from 'express'
import db from './db'
import { ResultSetHeader } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'

const router = express.Router()

interface Products extends RowDataPacket {
    id: number
    sku: string
    name: string
    description: string
    unit: string
    price: number
    is_active: number
}

router.get('/', async (req: Request, res: Response) => {
    try {
        const [result] = await db.execute<Products[]>('SELECT * FROM products')
        if (result.length === 0) {
            return res.status(404).json({
                message: 'Нет товаров'
            })
        }
        const saveResult = result.map((item: Products) => {
            const { id, sku, name, description, unit, price, is_active } = item

            return { id, sku, name, description, unit, price, is_active }
        })

        // безопасно выводить только нужные переменные из всех строк таблицы
        // сколько бы не добавлялось сюда, для вывода на фронт добавить сюда
        console.log('Tip')
        res.status(200).json(saveResult)
    } catch (error) {
        console.log(error)
        res.status(401).json({ message: 'Ошибка при получении товаров' })
    }
})

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {

    const id = req.params.id
    const [result] = await db.execute<Products[]>('SELECT * FROM products where id = ?', [id])

    res.status(200).json(result)

})


interface AddProducts {
    sku: string
    name: string
    description: string
    unit?: string
    price: number
}

router.post('/add', async (req: Request<{}, {}, AddProducts>, res: Response) => {
    const { sku, name, description, unit, price } = req.body

    const saveunit = unit || 'шт'

    if (!sku || !name || !description || !price) {
        return res.status(500).json({ message: 'Не указан один из пунктов' })
    }
    try {
        const [result] = await db.execute<ResultSetHeader>('INSERT INTO products (sku, name, description, unit, price) values (?,?,?,?,?)', [sku, name, description, saveunit, price])
        // добавить логику добавления товаров на все склады при создании товара
        res.status(200).json({ message: 'Успешное создание товара' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error })
    }
})
// этот интерфейс использую не только для добавления но и удаление и создания
interface AddStock {
    quantity: number
    warehouses_id: string
    product_id: string
}

router.post('/addstock', async (req: Request<{}, {}, AddStock>, res: Response) => {
    const { quantity, warehouses_id, product_id } = req.body
    try {
        const [result] = await db.execute<ResultSetHeader>('INSERT INTO stock (warehouse_id, product_id, quantity) VALUES (?,?,?)', [warehouses_id, product_id, quantity])
        res.status(200).json({ message: `Успешное добавление товара на склад` })
    } catch (error) {
        console.log(error)
    }
})

// выше создания товара на складе
// ниже добавление товара в остаток
router.post('/addquantity', async (req: Request<{}, {}, AddStock>, res: Response) => {
    const { quantity, warehouses_id, product_id } = req.body

    try {
        const [result] = await db.execute<ResultSetHeader>('UPDATE stock SET quantity = quantity + ? WHERE warehouse_id = ? AND product_id = ?;', [quantity, warehouses_id, product_id])
        res.status(200).json({ message: `Успешное обновление, добавили ${quantity}` })
    } catch (error) {
        console.log(error)
    }
})

// ниже убавление товарного остатка

router.post('/removequantity', async (req: Request<{}, {}, AddStock>, res: Response) => {
    const { quantity, warehouses_id, product_id } = req.body
    try {
        const [result] = await db.execute<RowDataPacket[]>('SELECT quantity FROM stock WHERE product_id = ? AND warehouse_id = ?', [product_id, warehouses_id])
        console.log(result[0])
        if (!result.length || (result[0]?.quantity ?? 0) < quantity) {
            return res.status(400).json({ message: 'Недостаточно товара на складе' })
        }
        const [update] = await db.execute<ResultSetHeader>('UPDATE stock SET quantity = quantity - ? WHERE warehouse_id = ? AND product_id = ?;', [quantity, warehouses_id, product_id])
        res.status(200).json({ message: 'Успешная отгрузка' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Ошибка сервера' })
    }
})

export default router
