const express = require('express')
const app = express()
app.use(express.json())

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const dbPath = path.join(__dirname, 'attendance.db')
const jwt = require('jsonwebtoken')
let db = null

const initializeDbAndServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  app.listen(3000, () => {
    console.log('Server Running at http://localhost:3000/')
  })
}

initializeDbAndServer()

//Teacher Register API
app.post('/teacher/register/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM teacher WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashingPassword = await bcrypt.hash(password, 10)

      const addUserQuery = `
            INSERT INTO
               teacher (username , password)
            VALUES
            (
              '${username}',
              '${hashingPassword}'
            );`

      await db.run(addUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//Teacher Login API

app.post('/teacher/login/', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `SELECT * FROM teacher WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const validatePassword = await bcrypt.compare(password, dbUser.password)

    if (validatePassword) {
      const jwtToken = await jwt.sign(dbUser, 'asdfghjkl')

      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//Student Register API

app.post('/student/register/', async (request, response) => {
  const {username, password, gender, attendance} = request.body
  const selectUserQuery = `SELECT * FROM student WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)

  const getAllStudents = `SELECT * FROM student;`
  const studentsArray = await db.all(getAllStudents)
  const sno = studentsArray.length + 1

  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashingPassword = await bcrypt.hash(password, 10)

      const addUserQuery = `
            INSERT INTO
               student (sno ,username , password, gender, attendance)
            VALUES
            (
               ${sno},
              '${username}',
              '${hashingPassword}',
              '${gender}',
              '${attendance}'
            );`

      await db.run(addUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//Student Login API

app.post('/student/login/', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `SELECT * FROM student WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const validatePassword = await bcrypt.compare(password, dbUser.password)

    if (validatePassword) {
      const jwtToken = await jwt.sign(dbUser, 'asdfghjkl')

      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const authenticateJwtToken = (request, response, next) => {
  let jwtToken

  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'asdfghjkl', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//Get ALL Students Details API

app.get(
  '/students/details/',
  authenticateJwtToken,
  async (request, response) => {
    const {username} = request

    if (username !== undefined) {
      try {
        const getStudentsQuery = `SELECT * FROM student;`
        const responseArray = await db.all(getStudentsQuery)
        response.send(responseArray)
      } catch (err) {
        console.error(err)
        response.status(500).send('Internal Server Error')
      }
    } else {
      response.send(400)
      response.send("We can't move with your request")
    }
  },
)

//Remove Student API
app.delete('/student/:sno', authenticateJwtToken, async (request, response) => {
  const {sno} = request.params

  try {
    const deleteStudentQuery = `
      DELETE FROM student
      WHERE sno = ?;
    `

    await db.run(deleteStudentQuery, [sno])
    if (db.changes === 0) {
      return response.status(404).send('Student not found')
    }

    response.send('Student Removed')
  } catch (err) {
    console.error(err)
    response.status(500).send('Internal Server Error')
  }
})

module.exports = app
