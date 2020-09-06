FROM golang:1.13-alpine AS builder

ENV GO111MODULE=on

#WORKDIR /go/src/github.com/gusaul/grpcox
WORKDIR /src

COPY . ./
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o grpcox grpcox.go


FROM alpine

RUN mkdir log && touch log/grpcox.log
COPY ./index /index
COPY --from=builder /src/grpcox ./
RUN mkdir -p /log
EXPOSE 6969
ENTRYPOINT ["./grpcox"]
