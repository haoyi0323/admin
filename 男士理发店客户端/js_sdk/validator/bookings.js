// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "userId": {
    "rules": [
      {
        "format": "string"
      }
    ]
  },
  "serviceId": {
    "rules": [
      {
        "format": [
          "int",
          "long",
          "double",
          "string"
        ]
      }
    ]
  },
  "date": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ]
  },
  "time": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ]
  },
  "durationMin": {
    "rules": [
      {
        "required": true
      },
      {
        "format": [
          "int",
          "long",
          "double"
        ]
      }
    ]
  },
  "remark": {
    "rules": [
      {
        "format": "string"
      }
    ]
  },
  "contactPhone": {
    "rules": [
      {
        "format": "string"
      }
    ]
  },
  "status": {
    "rules": [
      {
        "format": "string"
      },
      {
        "range": [
          {
            "value": "booked",
            "text": "booked"
          },
          {
            "value": "finished",
            "text": "finished"
          },
          {
            "value": "canceled",
            "text": "canceled"
          }
        ]
      }
    ]
  },
  "createdAt": {
    "rules": [
      {
        "format": [
          "int",
          "long"
        ]
      }
    ]
  }
}

const enumConverter = {
  "status_valuetotext": {
    "booked": "booked",
    "finished": "finished",
    "canceled": "canceled"
  }
}

function filterToWhere(filter, command) {
  let where = {}
  for (let field in filter) {
    let { type, value } = filter[field]
    switch (type) {
      case "search":
        if (typeof value === 'string' && value.length) {
          where[field] = new RegExp(value)
        }
        break;
      case "select":
        if (value.length) {
          let selectValue = []
          for (let s of value) {
            selectValue.push(command.eq(s))
          }
          where[field] = command.or(selectValue)
        }
        break;
      case "range":
        if (value.length) {
          let gt = value[0]
          let lt = value[1]
          where[field] = command.and([command.gte(gt), command.lte(lt)])
        }
        break;
      case "date":
        if (value.length) {
          let [s, e] = value
          let startDate = new Date(s)
          let endDate = new Date(e)
          where[field] = command.and([command.gte(startDate), command.lte(endDate)])
        }
        break;
      case "timestamp":
        if (value.length) {
          let [startDate, endDate] = value
          where[field] = command.and([command.gte(startDate), command.lte(endDate)])
        }
        break;
    }
  }
  return where
}

export { validator, enumConverter, filterToWhere }
