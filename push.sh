docker tag strider/grpcox:`cat VERSION` 984868136916.dkr.ecr.us-east-1.amazonaws.com/strider/grpcox:`cat VERSION`
$(aws ecr get-login --no-include-email --region us-east-1)
docker push 984868136916.dkr.ecr.us-east-1.amazonaws.com/strider/grpcox:`cat VERSION`

