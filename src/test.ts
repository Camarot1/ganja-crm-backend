import express, { Request, Response } from 'express'
const router = express.Router()

router.get('/', async (req: Request, res: Response) => {
    res.json({ text: 'text' })
})

import db from './db'
import { RowDataPacket } from 'mysql2'
interface Test extends RowDataPacket {
    id: number
    name: string
}
router.get('/test', async (req: Request, res: Response) => {
    const input = 1
    const [result] = await db.execute<Test[]>('SELECT * FROM test where id = ?', [input])
    const test = result[0]
    if (!test) {
        return res.status(404).json({ message: 'Пусто' })
    }
    res.json({ message: test.name })
})

router.get('/all', async (req: Request, res: Response) => {
    const [result] = await db.execute<Test[]>('SELECT * FROM test')
    if (result.length === 0) {
        return res.status(404).json({ message: 'Пусто' })
    }
    res.json(result)
})

interface Post {
    id: number
    name: string
}

import { ResultSetHeader } from 'mysql2/promise'
router.post('/post', async (req: Request<{}, {}, Post>, res: Response) => {
    const { id, name } = req.body
    if (!name || !id) {
        return res.status(404).json({ message: 'Нет id или name' })
    }
    try {
        const [result] = await db.execute<ResultSetHeader>('INSERT INTO test (id, name) values (?,?)', [id, name])
        res.status(201).json({
            message: 'Успешно',
            id: result.insertId
        })
    }catch(error){
        console.log(error)
        res.status(500).json({error: 'Ошибка при вставке', })
    }
})

export default router