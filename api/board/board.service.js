const dbService = require('../../services/db.service')
const ObjectId = require('mongodb').ObjectId
const asyncLocalStorage = require('../../services/als.service')
const logger = require('../../services/logger.service')
const utilService = require('../../services/util.service')

async function query() {
    try {
        // console.log('Filter from backend service: ', filterBy)
        // const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection('board')
        const boards = await collection.find().toArray()
        return boards
    } catch (err) {
        logger.error('cannot find boards', err)
        throw err
    }

}

async function getById(boardId, filterBy = {}) {
    try {
        const collection = await dbService.getCollection('board')
        const board = await collection.findOne({ '_id': ObjectId(boardId) })
        if (!Object.keys(filterBy).length) return board

        if (typeof filterBy.labels === 'string') filterBy.labels = [filterBy.labels]
        if (typeof filterBy.members === 'string') filterBy.members = [filterBy.members]
        const filteredGroups = board.groups.map(group => {
            const cards = group.cards.filter(card => {
                return (!filterBy.txt || card.title.toLocaleLowerCase().includes(filterBy.txt.toLocaleLowerCase()))
                    && (!filterBy.labels || card.labelIds?.some((curr) => filterBy.labels?.includes(curr)))
                    && (!filterBy.members || card.members?.some(curr => filterBy.members?.includes(curr._id)))

            })
            group.cards = cards
            return group
        })
        const filteredBoard = { ...board, groups: filteredGroups }
        return filteredBoard
    } catch (err) {
        logger.error(`Error while finding board ${boardId}`, err)
        throw err
    }
}

async function getDashboardData(boardId) {
    const board = await getById(boardId);
    const chartsData = {
        groupsCount: 0,
        cardsCount: 0,
        tasksPerMemberMap: {},
        tasksPerLabelMap: {},
        tasks: []
    };
    if (board.members) {
        board.members.forEach(member => {
            chartsData.tasksPerMemberMap[member.fullname] = 0
        })
    }
    if (board.labels) {
        board.labels.forEach(label => {
            chartsData.tasksPerLabelMap[label.title] = 0
        })
    }

    if (board.groups) {
        board.groups.forEach(group => {
            if (!group.isArchive) {
                chartsData.groupsCount = chartsData.groupsCount + 1
                group.cards.forEach(card => {
                    if (!card.isArchive) {

                        chartsData.cardsCount = chartsData.cardsCount + 1
                        if (card.dueDate) {
                            chartsData.tasks.push({
                                id: card.id,
                                name: card.title,
                                start: new Date(card.createdAt),
                                end: new Date(card.dueDate),
                            })
                        }
                        if (card.members) {
                            card.members.forEach(member => {
                                chartsData.tasksPerMemberMap[member.fullname]++;
                            })
                        }
                        if (card.labelIds) {
                            card.labelIds.forEach(labelId => {
                                const label = utilService.getLabel(board.labels, labelId);
                                chartsData.tasksPerLabelMap[label.title]++
                            })
                        }
                    }
                })
            }
        })
    }
    return chartsData;
}

async function update(board) {
    try {
        let boardId = ObjectId(board._id)
        delete board._id
        const collection = await dbService.getCollection('board')
        await collection.updateOne({ "_id": boardId }, { $set: {...board } })
    } catch (err) {
        logger.error(`cannot update board ${boardId}`, err)
        throw err
    }
}

async function remove(boardId) {
    try {
        const store = asyncLocalStorage.getStore()
        const { userId, isAdmin } = store
        const collection = await dbService.getCollection('board')
            // remove only if user is owner/admin
        const criteria = { _id: ObjectId(boardId) }
        if (!isAdmin) criteria.byUserId = ObjectId(userId)
        await collection.deleteOne(criteria)
    } catch (err) {
        logger.error(`cannot remove board ${boardId}`, err)
        throw err
    }
}


async function add(board) {
    try {
        // peek only updatable fields!
        const boardToSave = {
            title: board.title,
            createdAt: Date.now(),
            style: (board.style) ? board.style : {},
            isStarred: false,
            createdBy: board.createdBy,
            groups: [],
            labels: [{
                    id: "l101",
                    title: "",
                    color: "#61bd4f"
                },
                {
                    id: "l102",
                    title: "",
                    color: "#FF9F1A"
                },
                {
                    id: "l103",
                    title: "",
                    color: "#eb5a46"
                },
                {
                    id: "l104",
                    title: "",
                    color: "#C377E0"
                },
                {
                    id: "l105",
                    title: "",
                    color: "#344563"
                },
                {
                    id: "l106",
                    title: "",
                    color: "#FF78CB"
                }
            ],
            members: [board.createdBy],
            activities: []
        }
        console.log('Board from server: ', boardToSave)
        const collection = await dbService.getCollection('board')
        await collection.insertOne(boardToSave)
        return boardToSave
    } catch (err) {
        logger.error('cannot insert board', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.txt) {
        criteria.groups = { $regex: filterBy.txt, $options: 'i' }
    }
    return criteria
}


module.exports = {
    query,
    remove,
    add,
    getById,
    update,
    getDashboardData
}