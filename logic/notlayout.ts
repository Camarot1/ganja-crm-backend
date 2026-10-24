import db from '../src/db'
import { ResultSetHeader } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'

export type Type = 'DELETE' | 'UPDATE' | 'ERROR'

export interface NotLayoutCommand {
    type: Type

    itemId?: number
    newQuantity?: number

    message?: string
}

export function AnalyzeLayoutItem(front: number, back: number, itemId: number): NotLayoutCommand {
    if (front > back) {
        return {
            type: 'ERROR',
            itemId,
            message: `Вы пытаетесь удалить товаров больше чем есть на складе`
        }
    }

    if (front == back) {
        return {
            type: 'DELETE',
            itemId,
            message: 'Удаление товара'
        }
    }

    const data = back - front

    return {
        type: 'UPDATE',
        itemId,
        newQuantity: data,
        message: 'Обновление'
    }
}

export async function LayoutCommand(command: NotLayoutCommand): Promise<void> {
    switch (command.type) {
        case 'DELETE':
            await db.execute('delete from not_layout_item where id = ?', [command.itemId!])
            break

        case 'UPDATE':
            await db.execute<ResultSetHeader>('update not_layout_item set quantity = ? where id = ?', [command.newQuantity!,command.itemId!])
            break

        case 'ERROR':
            console.warn(`Ошибка при выполнении команды ${command.message}`)
            break
        
        default:
            throw new Error('Ошибка при передачи из аналитика')
    }
}