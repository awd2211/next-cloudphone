# Atlas configuration for Device Service
# 设备服务数据库迁移配置

env "local" {
  url = "postgres://postgres:postgres@localhost:5432/cloudphone_device?sslmode=disable"
  dev = "docker://postgres/15/dev"
  
  migration {
    dir = "file://migrations"
  }
  
  src = "file://schema.hcl"
  
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
  
  lint {
    destructive {
      error = true
    }
    data_depend {
      error = false
    }
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
    auto_approve = false
  }
  src = "file://schema.hcl"
}

env "production" {
  url = getenv("DATABASE_URL")
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
    auto_approve = false
    baseline = getenv("MIGRATION_BASELINE")
  }
  src = "file://schema.hcl"
  
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

