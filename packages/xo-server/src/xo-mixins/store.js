import levelup from 'level-party'
import sublevel from 'level-sublevel'
import { ensureDir } from 'fs-extra'

import { forEach, promisify } from '../utils'

// ===================================================================

const _levelHas = function has(key, cb) {
  if (cb) {
    return this.get(key, (error, value) =>
      error ? (error.notFound ? cb(null, false) : cb(error)) : cb(null, true)
    )
  }

  try {
    this.get(key)
    return true
  } catch (error) {
    if (!error.notFound) {
      throw error
    }
  }
  return false
}
const levelHas = db => {
  db.has = _levelHas

  return db
}

const levelPromise = db => {
  const dbP = {}
  forEach(db, (value, name) => {
    if (typeof value !== 'function') {
      return
    }

    if (name.endsWith('Stream') || name.startsWith('is')) {
      dbP[name] = db::value
    } else {
      dbP[name] = promisify(value, db)
    }
  })

  return dbP
}

// ===================================================================

export default class {
  constructor(xo, config) {
    const dir = `${config.datadir}/leveldb`
    this._db = ensureDir(dir).then(() => {
      return sublevel(
        levelup(dir, {
          valueEncoding: 'json',
        })
      )
    })
  }

  getStore(namespace) {
    return this._db.then(db => levelPromise(levelHas(db.sublevel(namespace))))
  }
}
