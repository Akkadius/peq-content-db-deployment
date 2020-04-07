#----------------------
# Parse makefile arguments
#----------------------
RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(RUN_ARGS):;@:)

#----------------------
# Silence GNU Make
#----------------------
ifndef VERBOSE
MAKEFLAGS += --no-print-directory
endif

#----------------------
# Load .env file
#----------------------
ifneq ("$(wildcard .env)","")
include .env
export
else
endif

#----------------------
# Terminal
#----------------------

GREEN  := $(shell tput -Txterm setaf 2)
WHITE  := $(shell tput -Txterm setaf 7)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

#------------------------------------------------------------------
# - Add the following 'help' target to your Makefile
# - Add help text after each target name starting with '\#\#'
# - A category can be added with @category
#------------------------------------------------------------------

HELP_FUN = \
	%help; \
	while(<>) { \
		push @{$$help{$$2 // 'options'}}, [$$1, $$3] if /^([a-zA-Z\-]+)\s*:.*\#\#(?:@([a-zA-Z\-]+))?\s(.*)$$/ }; \
		print "-----------------------------------------\n"; \
		print "| usage: make [command]\n"; \
		print "-----------------------------------------\n\n"; \
		for (sort keys %help) { \
			print "${WHITE}$$_:${RESET \
		}\n"; \
		for (@{$$help{$$_}}) { \
			$$sep = " " x (32 - length $$_->[0]); \
			print "  ${YELLOW}$$_->[0]${RESET}$$sep${GREEN}$$_->[1]${RESET}\n"; \
		}; \
		print "\n"; \
	}

help: ##@other Show this help.
	@perl -e '$(HELP_FUN)' $(MAKEFILE_LIST)

#----------------------
# util
#----------------------

bootstrap: ##@util Something
	@docker-compose exec proxysql mysql -u admin -padmin -h 127.0.0.1 -P 6032 --prompt='ProxySQLAdmin> ' -e "UPDATE global_variables SET variable_value='admin:${PROXY_SQL_ADMIN_PASSWORD}' WHERE variable_name='admin-admin_credentials'; LOAD ADMIN VARIABLES TO RUNTIME; SAVE ADMIN VARIABLES TO DISK;" || printf "Already initialized admin\n"
	@docker-compose exec proxysql mysql -u admin -p${PROXY_SQL_ADMIN_PASSWORD} -h 127.0.0.1 -P 6032 --prompt='ProxySQLAdmin> ' -e "DELETE FROM mysql_servers; INSERT INTO mysql_servers (hostgroup_id,hostname,port,max_replication_lag) VALUES (0,'mariadb',3306,0); LOAD MYSQL SERVERS TO RUNTIME; SAVE MYSQL SERVERS TO DISK;"
	@docker-compose exec proxysql mysql -u admin -p${PROXY_SQL_ADMIN_PASSWORD} -h 127.0.0.1 -P 6032 --prompt='ProxySQLAdmin> ' -e "DELETE FROM mysql_servers; INSERT INTO mysql_servers (hostgroup_id,hostname,port,max_replication_lag) VALUES (0,'mariadb',3306,0); LOAD MYSQL SERVERS TO RUNTIME; SAVE MYSQL SERVERS TO DISK;"

create-user: ##@util Create user (user=x password=x)
	@docker-compose exec proxysql mysql -u admin -p${PROXY_SQL_ADMIN_PASSWORD} -h 127.0.0.1 -P 6032 --prompt='ProxySQLAdmin> ' -e "REPLACE INTO mysql_users(username, password, default_hostgroup, default_schema) VALUES ('$(user)', '$(password)', 0, '${MARIADB_DATABASE}');LOAD MYSQL USERS TO RUNTIME;SAVE MYSQL USERS TO DISK; "
	@docker-compose exec mariadb mysql -u root -p${MARIADB_ROOT_PASSWORD} -h 127.0.0.1 --prompt='ProxySQLAdmin> ' -e "DROP user IF EXISTS '$(user)'@'%'; CREATE USER '$(user)'@'%' IDENTIFIED BY '$(password)'; GRANT SELECT, INSERT, UPDATE, DELETE ON ${MARIADB_DATABASE}.* TO $(user);"

proxyadmin: ##@util Proxy admin shell
	@docker-compose exec proxysql mysql -u admin -p${PROXY_SQL_ADMIN_PASSWORD} -h 127.0.0.1 -P 6032 --prompt='ProxySQLAdmin> '

mc: ##@util MySQL admin shell
	docker-compose exec mariadb mysql -u root -p${MARIADB_ROOT_PASSWORD} -h 127.0.0.1
