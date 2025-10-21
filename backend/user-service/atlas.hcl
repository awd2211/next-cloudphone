# Atlas configuration for User Service
# 用户服务数据库迁移配置

env "local" {
  # 数据库连接 URL
  url = "postgres://postgres:postgres@localhost:5432/cloudphone_user?sslmode=disable"
  
  # 开发数据库（用于生成迁移和验证）
  dev = "docker://postgres/15/dev"
  
  # 迁移文件目录
  migration {
    dir = "file://migrations"
  }
  
  # Schema 定义文件
  src = "file://schema.hcl"
  
  # 格式化配置
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
  
  # Lint 规则 - 检测破坏性变更
  lint {
    # 检测删除表
    destructive {
      error = true
    }
    # 检测数据丢失风险
    data_depend {
      error = false
    }
    # 检测向后兼容性
    incompatible {
      error = true
    }
  }
}

env "dev" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
  }
  src = "file://schema.hcl"
}

env "staging" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
    # 自动批准安全的迁移
    auto_approve = false
  }
  src = "file://schema.hcl"
}

env "production" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
    # 生产环境必须手动批准
    auto_approve = false
    # 执行前备份
    baseline = getenv("MIGRATION_BASELINE")
  }
  src = "file://schema.hcl"
  
  # 严格的 Lint 规则
  lint {
    destructive {
      error = true
    }
    data_depend {
      error = true
    }
    incompatible {
      error = true
    }
  }
}

