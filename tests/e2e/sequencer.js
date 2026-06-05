const Sequencer = require('@jest/test-sequencer').default

const ORDER = [
  'home.test.js',
  'library.test.js',
  'detail.test.js',
  'performance.test.js'
]

class CustomSequencer extends Sequencer {
  sort(tests) {
    return [...tests].sort((a, b) => {
      const aName = a.path.split('/').pop()
      const bName = b.path.split('/').pop()
      const aIdx = ORDER.indexOf(aName)
      const bIdx = ORDER.indexOf(bName)
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })
  }
}

module.exports = CustomSequencer
