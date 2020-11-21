SHELL = /bin/sh

#
# define CLI prefix for commands
#
BLUE_ = \033[34m
CYAN_ = \033[36m
GRAY_ = \033[90m
BOLD_ = \033[1m
_ENDF = \033[0m
define prompt
	@echo "$(CYAN_)make:$@$(GRAY_)$$$(_ENDF) \c"
endef
define header
	@echo ""
	@echo "$(BLUE_)$(BOLD_)************************************************************$(_ENDF)"
	@echo "$(BLUE_):: $(CYAN_)make.target = $(BOLD_)$@$(_ENDF)"
	@echo "$(BLUE_)$(BOLD_)************************************************************$(_ENDF)"
endef

#
# configure goals
#
default: clean network templates servers
.PHONY: .gitignore clean destroy network templates servers

#
# create .gitignore file
#
.gitignore:
	$(call header)
	$(call prompt)
	curl https://www.toptal.com/developers/gitignore/api/dotenv,linux,osx,visualstudiocode,windows > $@
	$(call prompt) 
	cat .utils/gitignore.io-ext >> $@

#
# remove generated files from project
#
clean:
	$(call header)
	$(call prompt)
	rm -f **/*.validated.json
destroy: clean
	$(call header)
	$(call prompt)
	./servers/destroy-resources.sh --all
	$(call prompt)
	./templates/destroy-resources.sh
	$(call prompt)
	./network/destroy-resources.sh

#
# deploy networking components
#
network:
	$(call header)
	$(call prompt)
	./network/sync-resources.sh

#
# deploy EC2 launch templates
#
templates: | network
	$(call header)
	$(call prompt)
	./templates/sync-resources.sh

#
# deploy game servers
#
servers: | network templates
	$(call header)
	$(call prompt)
	./servers/sync-resources.sh
	$(call prompt)
	./servers/destroy-resources.sh --only-orphans
