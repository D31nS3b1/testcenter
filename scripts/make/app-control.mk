# Initialized the Application. Run this right after checking out the Repo.
init:
	make init-env
	make init-frontend
	make init-ensure-file-rights
	#make composer-install
	make fix-docker-user

# Build all images of the project or a specified one as dev-images.
# Param: (optional) service - Only build a specified service, eg `service=testcenter-backend`
build:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml build $(service)

# Starts the application.
# Hint: Stop local webserver before, to free port 80
# Param: (optional) service - Only build a specified service, eg `service=testcenter-backend`
run:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up $(service)

# Build all images of the project or a specified one as prod-images.
# Param: (optional) service - Only build a specified service, eg `service=testcenter-backend`
build-prod-local:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml -f docker/docker-compose.local-prod.yml build $(service)

# Starts the application with locally build prod-images.
# Hint: Stop local webserver before, to free port 80
# Param: (optional) service - Only build a specified service, eg `service=testcenter-backend`
run-prod-local:
	make build-prod-local container=$(service)
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.local-prod.yml up $(service)

# Stops the application.
stop:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml stop $(service)


# Stops the application. Deletes all containers.
down:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml down --remove-orphans $(service)
