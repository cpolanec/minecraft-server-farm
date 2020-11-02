SHELL = /bin/sh

#
# get environment variables
#
-include .env

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
# common values
#
stack-name := minecraft-network-$(ENVIRONMENT)

#
# configure goals
#
default: clean network
.PHONY: .gitignore clean network

#
# create .gitignore file
#
.gitignore:
	$(call header)
	$(call prompt)
	curl https://www.toptal.com/developers/gitignore/api/dotenv,linux,osx,visualstudiocode,windows > $@
	$(call prompt) 
	cat utils/gitignore.io-ext >> $@

#
# remove generated files from project
#
clean:
	$(call header)
	$(call prompt)
	rm -f *.validated.yml
destroy: clean
	$(call header)
	$(call prompt)
	aws cloudformation delete-stack \
	  --stack-name $(stack-name) --role-arn $(CLOUDFORMATION_ROLE_ARN)
	$(call prompt)
	aws cloudformation wait stack-delete-complete --stack-name $(stack-name)

#
# deploy Minecraft networking components
#
aws-vpc-foundation.validated.yml: aws-vpc-foundation.yml
	$(call header)
	$(call prompt)
	aws cloudformation validate-template --template-body file://./$< > $@
	$(call prompt)
	aws cloudformation deploy \
	  --stack-name $(stack-name) \
	  --role-arn $(CLOUDFORMATION_ROLE_ARN) \
	  --no-fail-on-empty-changeset \
	  --template-file $< \
	  --s3-bucket $(CLOUDFORMATION_S3_BUCKET) \
	  --s3-prefix $(stack-name) \
	  --parameter-overrides Environment=$(ENVIRONMENT)
network: aws-vpc-foundation.validated.yml