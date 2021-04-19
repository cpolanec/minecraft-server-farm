import diagrams
import diagrams.aws.compute as compute
import diagrams.aws.devtools as devtools
import diagrams.aws.management as manage
import diagrams.aws.network as network
import diagrams.aws.storage as storage

diagram_attr = {
    'margin': '-0.8,-0.8',
    'size': '10,8',
    'bgcolor': 'transparent'
}
with diagrams.Diagram(
    '',
    show=False,
    graph_attr=diagram_attr,
    filename='docs/overview',
    # direction='TB'
    direction='LR'
):

    attr = {
        'margin': '30'
    }

    with diagrams.Cluster(
            'Cloud Development Kit (CDK)', graph_attr=attr):

        app = devtools.CloudDevelopmentKit(
            'CDK App\n[mcservers]')

        with diagrams.Cluster(
                'CDK Stack = Network',
                graph_attr=attr):
            networkStack = manage.CloudformationStack(
                'CloudFormation Stack\n[mcservers-env-network]')

        with diagrams.Cluster(
                'CDK Stack = Hosts',
                graph_attr=attr):
            hostAStack = manage.CloudformationStack(
                'Nested Stack\n[Server A]')
            hostBStack = manage.CloudformationStack(
                'Nested Stack\n[Server B]')
            hostCStack = manage.CloudformationStack(
                'Nested Stack\n[Server C]')
            hostsStack = manage.CloudformationStack(
                'CloudFormation Stack\n[mcservers-env-hosts]')
            hostsStack >> [hostCStack, hostBStack, hostAStack]

        app >> [hostsStack, networkStack]

    with diagrams.Cluster('Networking Resources', graph_attr=attr):
        vpc = network.VPC('VPC')
        subnet = network.PublicSubnet('Public Subnet')
        vpc - subnet
    networkStack >> [vpc, subnet]

    with diagrams.Cluster('Compute Resources', graph_attr=attr):
        ec2a = compute.EC2('Minecraft\nServer A')
        ec2b = compute.EC2('Minecraft\nServer B')
        ec2c = compute.EC2('Minecraft\nServer C')

    hostAStack >> ec2a
    hostBStack >> ec2b
    hostCStack >> ec2c

    ec2a - subnet
    ec2b - subnet
    ec2c - subnet
