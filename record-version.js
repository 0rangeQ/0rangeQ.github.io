const { execFileSync} = require('node:child_process')
require('@bprcode/handy')

const lastCommit = String(
                    execFileSync('git', ['log', '-1', '--pretty=%h (%s)']))
                    .slice(0, -1)
log(moo() + ' Updating from ' + lastCommit + ' to new version…')
